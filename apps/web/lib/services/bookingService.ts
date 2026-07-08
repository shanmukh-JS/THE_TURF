// ============================================================================
// TRUF GAMING — Booking Service
// Business logic for booking creation, cancellation, and validation.
// Coordinates between repositories and dispatches domain events.
// ============================================================================

import { bookingRepository } from '@/lib/repositories/bookingRepository'
import { slotRepository } from '@/lib/repositories/slotRepository'
import { writeAuditLog } from '@/lib/utils/logger'
import { BOOKING } from '@/config/settings'
import type { Booking, BookingStatus } from '@/types/models'

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
   * Creates a booking with proper slot locking.
   */
  async createBooking(params: {
    slotId: string
    venueId: string
    customerId: string
    totalAmount: number
    advancePaid: number
    paymentId?: string
    ip?: string
    userAgent?: string
  }): Promise<Booking> {
    // 1. Validate slot availability
    await this.validateSlotAvailability(params.slotId)

    // 2. Lock the slot
    const lockExpiry = new Date(Date.now() + BOOKING.lockDurationSeconds * 1000).toISOString()
    const locked = await slotRepository.lockSlot(params.slotId, lockExpiry)
    if (!locked) {
      throw new Error('Failed to reserve the slot. It may have just been booked.')
    }

    try {
      // 3. Create booking record
      const booking = await bookingRepository.create({
        slot_id: params.slotId,
        venue_id: params.venueId,
        customer_id: params.customerId,
        total_amount: params.totalAmount,
        advance_paid: params.advancePaid,
        status: 'CONFIRMED' as BookingStatus,
        payment_id: params.paymentId || null,
      } as Omit<Booking, 'id'>)

      // 4. Mark slot as booked
      await slotRepository.updateStatus(params.slotId, 'Booked', true)

      // 5. Audit log
      await writeAuditLog({
        actor_id: params.customerId,
        module: 'BOOKING',
        action: 'BOOKING_CREATED',
        target_id: booking.id,
        new_value: { venue_id: params.venueId, amount: params.totalAmount },
        ip_address: params.ip || null,
        user_agent: params.userAgent || null,
      })

      return booking
    } catch (err) {
      // Rollback: unlock the slot if booking creation failed
      await slotRepository.updateStatus(params.slotId, 'Available', false)
      throw err
    }
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
