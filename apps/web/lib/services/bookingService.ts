// ============================================================================
// TRUF GAMING — Booking Service
// Business logic for booking creation, cancellation, and validation.
// Coordinates between repositories and dispatches domain events.
// ============================================================================

import { bookingRepository } from '@/lib/repositories/bookingRepository'
import { slotRepository } from '@/lib/repositories/slotRepository'
import { writeAuditLog } from '@/lib/utils/logger'
import { BOOKING } from '@/config/settings'
import { getEnv } from '@/config/env'
import type { Booking, BookingStatus } from '@/types/models'
import { paymentProvider } from '@/lib/payments/provider'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { addTraceAttributes } from '@/lib/utils/tracing'

export class BookingService {
  /**
   * Validates that a slot can be booked and is not already taken.
   * Returns the slot or throws a descriptive error.
   */
  async validateSlotAvailability(slotId: string): Promise<void> {
    const slot = await slotRepository.findById(slotId)

    if (!slot) {
      throw new Error('Slot not found.')
    }

    if (slot.is_booked || slot.status === 'Booked') {
      throw new Error('This slot has already been booked.')
    }

    if (slot.is_locked && slot.lock_expires) {
      const lockExpiry = new Date(slot.lock_expires)
      if (lockExpiry > new Date()) {
        throw new Error(
          'This slot is currently being booked by another user. Please try again shortly.'
        )
      }
      // Lock has expired — unlock it
      await slotRepository.updateStatus(slotId, 'Available', false)
    }
  }

  /**
   * Starts checkout by validating slot, creating a temporary lock, and generating a Razorpay Order.
   */
  async startCheckout(params: {
    slotId: string
    venueId: string
    customerId: string
    totalAmount: number
    advancePaid: number
    ip?: string
    userAgent?: string
  }) {
    addTraceAttributes({
      'user.id': params.customerId,
      'booking.slot_id': params.slotId,
      'venue.id': params.venueId,
    })

    // 1. Validate slot availability
    await this.validateSlotAvailability(params.slotId)

    // 2. Lock the slot temporarily
    const lockExpiry = new Date(Date.now() + BOOKING.lockDurationSeconds * 1000).toISOString()
    const locked = await slotRepository.lockSlot(params.slotId, lockExpiry)
    if (!locked) {
      throw new Error('Failed to reserve the slot. It may have just been booked.')
    }

    try {
      const env = getEnv()
      if (!env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !env.RAZORPAY_SECRET) {
        throw new Error('Payment gateway not configured properly.')
      }

      // 3. Create Razorpay Order via PaymentProvider (which handles Circuit Breaking)
      const order = await paymentProvider.createOrder({
        amount: Math.round(params.advancePaid * 100), // amount in smallest currency unit (paise)
        receipt: `receipt_${params.slotId}_${Date.now()}`,
        notes: {
          slotId: params.slotId,
          venueId: params.venueId,
          customerId: params.customerId,
          totalAmount: params.totalAmount.toString(),
        },
      })

      // 4. Audit Log (Checkout Started)
      await writeAuditLog({
        actor_id: params.customerId,
        module: 'BOOKING',
        action: 'CHECKOUT_STARTED',
        target_id: params.slotId,
        new_value: { order_id: order.id, amount: params.advancePaid },
        ip_address: params.ip || null,
        user_agent: params.userAgent || null,
      })

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      }
    } catch (err) {
      // Rollback: unlock the slot if order creation failed
      await slotRepository.updateStatus(params.slotId, 'Available', false)
      throw err
    }
  }

  /**
   * Verifies the payment callback and calls rpc_book_slot to finalize.
   */
  async verifyPaymentAndBook(params: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    slotId: string
    venueId: string
    customerId: string
    totalAmount: number
    advancePaid: number
    ip?: string
  }) {
    addTraceAttributes({
      'user.id': params.customerId,
      'booking.slot_id': params.slotId,
      'venue.id': params.venueId,
      'payment.provider': 'razorpay',
      'payment.id': params.razorpay_payment_id,
    })

    const env = getEnv()
    if (!env.RAZORPAY_SECRET) {
      throw new Error('Payment gateway not configured properly.')
    }

    // 1. Verify Signature
    const body = params.razorpay_order_id + '|' + params.razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest('hex')

    const isAuthentic = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(params.razorpay_signature)
    )

    if (!isAuthentic) {
      throw new Error('Invalid payment signature. Payment validation failed.')
    }

    // 2. Finalize Booking via rpc_book_slot (protects concurrency at DB level)
    const supabase = createAdminClient()
    const { data: bookingId, error } = await supabase.rpc('rpc_book_slot', {
      p_slot_id: params.slotId,
      p_venue_id: params.venueId,
      p_customer_id: params.customerId,
      p_total_amount: params.totalAmount,
      p_advance_paid: params.advancePaid,
      p_payment_id: params.razorpay_payment_id,
    })

    if (error) {
      throw new Error(`Failed to confirm booking: ${error.message}`)
    }

    // 3. Audit Log
    await writeAuditLog({
      actor_id: params.customerId,
      module: 'BOOKING',
      action: 'BOOKING_CREATED',
      target_id: bookingId,
      new_value: { payment_id: params.razorpay_payment_id, amount: params.advancePaid },
      ip_address: params.ip || null,
    })

    return bookingId
  }

  /**
   * Cancels a booking with validation and rollback of slot status.
   */
  async cancelBooking(params: {
    bookingId: string
    actorId: string
    reason?: string
    ip?: string
  }): Promise<void> {
    const booking = await bookingRepository.findById(params.bookingId)
    if (!booking) throw new Error('Booking not found.')
    if (booking.status === 'CANCELLED') throw new Error('Booking is already cancelled.')

    // Check cancellation window
    if (booking.slot) {
      const slotStart = new Date(booking.slot.start_time)
      const hoursUntilStart = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntilStart < BOOKING.cancellationWindowHours) {
        throw new Error(
          `Cancellations must be made at least ${BOOKING.cancellationWindowHours} hours before the slot start time.`
        )
      }
    }

    // Update booking status
    await bookingRepository.updateStatus(params.bookingId, 'CANCELLED')

    // Free up the slot
    if (booking.slot_id) {
      await slotRepository.updateStatus(booking.slot_id, 'Available', false)
    }

    // Audit log
    await writeAuditLog({
      actor_id: params.actorId,
      module: 'BOOKING',
      action: 'BOOKING_CANCELLED',
      target_id: params.bookingId,
      old_value: { status: booking.status },
      new_value: { status: 'CANCELLED', reason: params.reason },
      ip_address: params.ip || null,
    })
  }
}

export const bookingService = new BookingService()
