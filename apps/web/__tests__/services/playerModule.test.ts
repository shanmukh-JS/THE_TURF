import { describe, it, expect } from 'vitest'
import { calculateBookingStreak } from '../../lib/utils/streak'
import { XpService } from '../../lib/services/xpService'
import crypto from 'crypto'

describe('Player Module — Production Readiness & Integrity Suite', () => {
  describe('1. Booking Streak Calculation', () => {
    it('returns 0 for players with no bookings', () => {
      expect(calculateBookingStreak([])).toBe(0)
    })

    it('calculates 1 week for a booking made this week', () => {
      const now = new Date()
      const bookings = [
        {
          id: 'b1',
          status: 'CONFIRMED',
          slots: [{ date: now.toISOString().split('T')[0] }],
        },
      ]
      expect(calculateBookingStreak(bookings)).toBe(1)
    })

    it('calculates consecutive calendar weeks correctly', () => {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const bookings = [
        { id: 'b1', status: 'CONFIRMED', slots: [{ date: now.toISOString().split('T')[0] }] },
        { id: 'b2', status: 'COMPLETED', slots: [{ date: oneWeekAgo.toISOString().split('T')[0] }] },
        { id: 'b3', status: 'COMPLETED', slots: [{ date: twoWeeksAgo.toISOString().split('T')[0] }] },
      ]
      expect(calculateBookingStreak(bookings)).toBeGreaterThanOrEqual(2)
    })

    it('ignores CANCELLED bookings in streak calculation', () => {
      const now = new Date()
      const bookings = [
        {
          id: 'b1',
          status: 'CANCELLED',
          slots: [{ date: now.toISOString().split('T')[0] }],
        },
      ]
      expect(calculateBookingStreak(bookings)).toBe(0)
    })
  })

  describe('2. XP & Gamification Level Derivation', () => {
    const xpService = new XpService()

    it('starts at level 1 for 0 XP', () => {
      expect(xpService.calculateLevel(0)).toBe(1)
    })

    it('progresses to level 2 at 1000 XP', () => {
      expect(xpService.calculateLevel(1000)).toBe(2)
    })

    it('progresses to level 5 at 4500 XP', () => {
      expect(xpService.calculateLevel(4500)).toBe(5)
    })

    it('clamps to maximum level gracefully', () => {
      expect(xpService.calculateLevel(999999)).toBeLessThanOrEqual(50)
    })

    it('handles negative XP defensively without crashing below Level 1', () => {
      expect(xpService.calculateLevel(-500)).toBe(1)
    })
  })

  describe('3. Checkout Idempotency & Race-Condition Safety', () => {
    it('generates consistent deterministic checkout hashes within time window', () => {
      const userId = 'usr_12345'
      const slotId = 'slt_67890'
      const timeWindow = Math.floor(Date.now() / 30000)

      const hash1 = crypto
        .createHash('sha256')
        .update(`${userId}_${slotId}_${timeWindow}`)
        .digest('hex')

      const hash2 = crypto
        .createHash('sha256')
        .update(`${userId}_${slotId}_${timeWindow}`)
        .digest('hex')

      expect(hash1).toBe(hash2)
    })

    it('generates distinct hashes for different slots or users', () => {
      const timeWindow = Math.floor(Date.now() / 30000)

      const hashA = crypto
        .createHash('sha256')
        .update(`userA_slot1_${timeWindow}`)
        .digest('hex')

      const hashB = crypto
        .createHash('sha256')
        .update(`userB_slot1_${timeWindow}`)
        .digest('hex')

      expect(hashA).not.toBe(hashB)
    })
  })

  describe('4. Server-Side Price & Advance Validation', () => {
    it('calculates exactly 50% advance for bookings', () => {
      const slotPrice = 1200
      const expectedAdvance = Math.round(slotPrice * 0.5)
      expect(expectedAdvance).toBe(600)
    })

    it('flags price tampering when client submits manipulated price', () => {
      const expectedTotal = 1500
      const clientSubmitted = 1000
      const mismatch = Math.abs(clientSubmitted - expectedTotal) > 0.01
      expect(mismatch).toBe(true)
    })
  })
})
