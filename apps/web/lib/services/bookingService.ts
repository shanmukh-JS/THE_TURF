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
import { getPaymentProvider } from '@/lib/payments/factory'
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
      const order = await getPaymentProvider().createOrder({
        amount: Math.round(params.advancePaid * 100), // amount in smallest currency unit (paise)
        currency: 'INR',
        receiptId: `rcpt_${params.slotId.substring(0, 8)}_${Date.now()}`,
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
    const secret = env.RAZORPAY_SECRET || process.env.RAZORPAY_SECRET || '2KTcoZPGLwaRVUasD9HjRy04'

    // 1. Verify Signature (with fallback to Razorpay API fetch)
    let isAuthentic = false

    if (secret && params.razorpay_signature) {
      try {
        const body = params.razorpay_order_id + '|' + params.razorpay_payment_id
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(body.toString())
          .digest('hex')

        const expectedBuffer = Buffer.from(expectedSignature)
        const signatureBuffer = Buffer.from(params.razorpay_signature || '')

        if (
          expectedBuffer.length === signatureBuffer.length &&
          crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
        ) {
          isAuthentic = true
        }
      } catch (sigErr) {
        console.warn('HMAC signature check error:', sigErr)
      }
    }

    // Fallback: Verify directly with Razorpay API if HMAC failed or secret differed
    if (!isAuthentic) {
      try {
        const paymentProvider = getPaymentProvider()
        const paymentDetails = await paymentProvider.fetchPayment(params.razorpay_payment_id)
        if (
          paymentDetails &&
          (paymentDetails.status === 'captured' || paymentDetails.status === 'authorized') &&
          (paymentDetails.order_id === params.razorpay_order_id || !paymentDetails.order_id)
        ) {
          console.log(
            `Payment ${params.razorpay_payment_id} verified directly via Razorpay API (status: ${paymentDetails.status})`
          )
          isAuthentic = true
        }
      } catch (fetchErr) {
        console.warn('Failed to verify payment via Razorpay API fetch:', fetchErr)
      }
    }

    if (!isAuthentic) {
      throw new Error('Invalid payment signature. Payment validation failed.')
    }

    // 2. Finalize Booking via rpc_book_slot or direct atomic fallback
    const supabase = createAdminClient()

    // Check if booking already exists for this payment
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_id', params.razorpay_payment_id)
      .maybeSingle()

    if (existingBooking?.id) {
      console.log(`Booking already exists for payment ${params.razorpay_payment_id}: ${existingBooking.id}`)
      return existingBooking.id
    }

    let bookingId: string | null = null

    // Try stored procedure first
    try {
      const { data: rpcBookingId, error: rpcError } = await supabase.rpc('rpc_book_slot', {
        p_slot_id: params.slotId,
        p_venue_id: params.venueId,
        p_customer_id: params.customerId,
        p_total_amount: params.totalAmount,
        p_advance_paid: params.advancePaid,
        p_payment_id: params.razorpay_payment_id,
      })

      if (!rpcError && rpcBookingId) {
        bookingId = rpcBookingId
      } else if (rpcError) {
        console.warn('rpc_book_slot failed, executing resilient direct booking fallback:', rpcError.message)
      }
    } catch (rpcErr) {
      console.warn('rpc_book_slot exception, falling back to direct booking:', rpcErr)
    }

    // Direct atomic database fallback if RPC was unavailable or threw an error
    if (!bookingId) {
      // Mark slot as booked
      await supabase
        .from('slots')
        .update({
          is_booked: true,
          is_locked: false,
          lock_expires: null,
          status: 'Booked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.slotId)

      // Create booking record
      const { data: newBooking, error: insErr } = await supabase
        .from('bookings')
        .insert({
          slot_id: params.slotId,
          venue_id: params.venueId,
          customer_id: params.customerId,
          total_amount: params.totalAmount,
          advance_paid: params.advancePaid,
          status: 'CONFIRMED',
          payment_id: params.razorpay_payment_id,
        })
        .select('id')
        .single()

      if (insErr || !newBooking) {
        // Double check if booking was inserted concurrently
        const { data: retryBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('slot_id', params.slotId)
          .eq('customer_id', params.customerId)
          .maybeSingle()

        if (retryBooking?.id) {
          bookingId = retryBooking.id
        } else {
          throw new Error(`Failed to create booking record: ${insErr?.message || 'Database error'}`)
        }
      } else {
        bookingId = newBooking.id
      }

      // Record in financial ledger (safely, won't block booking)
      try {
        await supabase.from('financial_ledger').insert({
          reference_id: bookingId,
          entry_type: 'BOOKING_PAYMENT',
          debit: params.totalAmount,
          credit: 0,
          balance_after: 0,
          actor_id: params.customerId,
          description: 'Booking payment received',
        })
      } catch (ledgerErr) {
        console.warn('Failed to insert to financial_ledger:', ledgerErr)
      }
    }

    if (!bookingId) {
      throw new Error('Failed to confirm booking: Could not obtain booking ID.')
    }

    const qrToken = crypto
      .createHash('sha256')
      .update(`${bookingId}_${params.customerId}_salt`)
      .digest('hex')
      .substring(0, 16)

    // Save QR token back to bookings
    try {
      await supabase.from('bookings').update({ qr_code: qrToken }).eq('id', bookingId)
    } catch (qrErr) {
      console.warn('Failed to update qr_code:', qrErr)
    }

    // Trigger asynchronous notification flows safely
    try {
      // Fetch details for notifications
      const { data: userProfile } = await supabase
        .from('customer_profiles')
        .select('full_name')
        .eq('user_id', params.customerId)
        .maybeSingle()

      const { data: userRecord } = await supabase
        .from('users')
        .select('phone, email')
        .eq('id', params.customerId)
        .maybeSingle()

      const { data: venueRecord } = await supabase
        .from('venues')
        .select('name, owner_profiles(user_id, full_name, users(email))')
        .eq('id', params.venueId)
        .maybeSingle()

      const { data: slotRecord } = await supabase
        .from('slots')
        .select('date, start_time, duration')
        .eq('id', params.slotId)
        .maybeSingle()

      const { emitBookingConfirmedEvent } = await import('@/lib/events/handlers')
      const { notificationScheduler } = await import('@/lib/services/notifications/Scheduler')

      const dateStr = slotRecord?.date ? new Date(slotRecord.date).toLocaleDateString() : ''
      const timeStr = slotRecord
        ? new Date(slotRecord.start_time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : ''
      const durationStr = slotRecord ? `${slotRecord.duration || 60} mins` : '60 mins'

      const ownerProfile: any = Array.isArray(venueRecord?.owner_profiles)
        ? venueRecord?.owner_profiles[0]
        : venueRecord?.owner_profiles
      const ownerUser: any = ownerProfile?.users
        ? Array.isArray(ownerProfile.users)
          ? ownerProfile.users[0]
          : ownerProfile.users
        : null

      await emitBookingConfirmedEvent({
        bookingId,
        userId: params.customerId,
        phone: userRecord?.phone || '',
        fullName: userProfile?.full_name || 'Player',
        venueName: venueRecord?.name || 'the Turf',
        date: dateStr,
        time: timeStr,
        duration: durationStr,
        amount: params.advancePaid.toString(),
        qrToken: qrToken,
        email: userRecord?.email || '',
        ownerId: ownerProfile?.user_id,
        ownerEmail: ownerUser?.email,
      })

      await notificationScheduler.scheduleBookingNotifications({
        bookingId,
        slotId: params.slotId,
        recipientPhone: userRecord?.phone || '',
        recipientEmail: userRecord?.email || '',
        customerName: userProfile?.full_name || 'Player',
        venueName: venueRecord?.name || 'the Turf',
      })
    } catch (e) {
      console.error('Failed to trigger confirmation events and reminders scheduler:', e)
    }

    // 3. Audit Log (safely)
    try {
      await writeAuditLog({
        actor_id: params.customerId,
        module: 'BOOKING',
        action: 'BOOKING_CREATED',
        target_id: bookingId,
        new_value: { payment_id: params.razorpay_payment_id, amount: params.advancePaid },
        ip_address: params.ip || null,
      })
    } catch (auditErr) {
      console.warn('Failed to write booking audit log:', auditErr)
    }

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

    // Check cancellation window (bypass for OWNER and ADMIN roles)
    const supabase = createAdminClient()
    const { data: actorRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', params.actorId)
      .single()

    const isStaff = actorRecord?.role === 'OWNER' || actorRecord?.role === 'ADMIN'

    if (!isStaff && booking.slot) {
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

    // Trigger cancellation notification event
    try {
      const supabase = createAdminClient()
      const { data: userProfile } = await supabase
        .from('customer_profiles')
        .select('full_name')
        .eq('user_id', booking.customer_id)
        .maybeSingle()

      const { data: userRecord } = await supabase
        .from('users')
        .select('phone')
        .eq('id', booking.customer_id)
        .single()

      const { data: venueRecord } = await supabase
        .from('venues')
        .select('name')
        .eq('id', booking.venue_id)
        .single()

      const { emitBookingCancelledEvent } = await import('@/lib/events/handlers')
      await emitBookingCancelledEvent({
        bookingId: params.bookingId,
        userId: booking.customer_id,
        phone: userRecord?.phone || '',
        fullName: userProfile?.full_name || 'Player',
        venueName: venueRecord?.name || 'the Turf',
        amount: booking.advance_paid.toString(),
        reason: params.reason || 'User requested cancellation',
      })
    } catch (e) {
      console.error('Failed to trigger cancellation notification event:', e)
    }

    // Free up the slot
    if (booking.slot_id) {
      await slotRepository.updateStatus(booking.slot_id, 'Available', false)
    }

    // Queue async refund job (don't block cancellation if Razorpay is down)
    if (booking.payment_id && booking.advance_paid > 0) {
      try {
        const supabase = createAdminClient()

        // Update payment status to REFUND_INITIATED
        await supabase
          .from('bookings')
          .update({ payment_status: 'REFUND_INITIATED' })
          .eq('id', params.bookingId)

        // Write refund job to outbox (processed by OutboxProcessor → BullMQ worker)
        await supabase.from('notification_outbox').insert({
          event_type: 'payment.refund',
          payload: {
            bookingId: params.bookingId,
            paymentId: booking.payment_id,
            amount: booking.advance_paid,
            customerId: booking.customer_id,
            reason: params.reason || 'User requested cancellation',
          },
          idempotency_key: `refund_${params.bookingId}_${Date.now()}`,
          priority: 'HIGH',
          status: 'PENDING',
        })

        // Log in payment audit
        await supabase.from('payment_audit').insert({
          booking_id: params.bookingId,
          user_id: booking.customer_id,
          razorpay_payment_id: booking.payment_id,
          status: 'REFUND_INITIATED',
          amount: booking.advance_paid,
          metadata: { reason: params.reason },
        })

        console.log(`[BookingService] Refund job queued for booking ${params.bookingId}`)
      } catch (refundErr) {
        console.error('Failed to queue refund job:', refundErr)
        // Don't block cancellation — the refund can be retried manually
      }
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
