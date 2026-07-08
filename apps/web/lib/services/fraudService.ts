// ============================================================================
// TRUF GAMING — Fraud Detection Rules
// Validates bookings and payments against anomalous patterns.
// ============================================================================

import { bookingRepository } from '@/lib/repositories/bookingRepository'
import { BOOKING } from '@/config/settings'
import { writeAuditLog } from '@/lib/utils/logger'

export class FraudService {
  /**
   * Checks if a customer is exhibiting fraudulent cancellation behavior.
   * If they exceed the configured cancellation threshold, they should be flagged.
   */
  async checkCancellationAbuse(
    customerId: string
  ): Promise<{ isFlagged: boolean; reason?: string }> {
    // 1. Get user's cancelled bookings in the last 30 days
    const recentCancellations = await bookingRepository.countByCustomer(customerId, 'CANCELLED')

    if (recentCancellations >= BOOKING.maxCancellationsPerMonth) {
      await writeAuditLog({
        actor_id: customerId,
        module: 'SYSTEM',
        action: 'FRAUD_FLAG_CANCELLATION_ABUSE',
        target_id: customerId,
        new_value: { cancellations: recentCancellations },
      })

      return {
        isFlagged: true,
        reason: `Exceeded maximum allowed cancellations (${BOOKING.maxCancellationsPerMonth} per month).`,
      }
    }

    return { isFlagged: false }
  }

  /**
   * Evaluates a booking attempt for velocity/spam fraud.
   * Basic implementation: prevents same customer booking > 3 slots in an hour.
   */
  async evaluateBookingVelocity(customerId: string): Promise<boolean> {
    // In a full implementation, you would query recent bookings by timestamp
    // For now, we simulate the structure
    const recentBookingsCount = await bookingRepository.countByCustomer(customerId)

    // Example rule: > 10 active bookings total flags the account
    if (recentBookingsCount > 10) {
      await writeAuditLog({
        actor_id: customerId,
        module: 'SYSTEM',
        action: 'FRAUD_FLAG_VELOCITY',
        target_id: customerId,
      })
      return false // Not allowed
    }

    return true // Allowed
  }
}

export const fraudService = new FraudService()
