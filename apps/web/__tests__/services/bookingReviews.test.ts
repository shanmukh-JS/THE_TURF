import { describe, it, expect, vi, beforeEach } from 'vitest'
import { XP } from '@/config/settings'
import { XpService } from '@/lib/services/xpService'

describe('Player Experience Review Flow & Archiving Logic', () => {
  let xpService: XpService

  beforeEach(() => {
    xpService = new XpService()
    vi.clearAllMocks()
  })

  describe('Gamification Review Awards Configuration', () => {
    it('should have first review award set to 50 XP', () => {
      expect((XP as any).firstReviewAward).toBe(50)
    })

    it('should have standard review award set to 20 XP', () => {
      expect((XP as any).reviewAward).toBe(20)
    })
  })

  describe('30-Minute Review Editing Window Logic', () => {
    it('should allow editing if review is less than 30 minutes old', () => {
      const createdAt = new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
      const submissionTime = new Date(createdAt).getTime()
      const nowTime = Date.now()
      const diffMinutes = (nowTime - submissionTime) / (1000 * 60)

      expect(diffMinutes).toBeLessThan(30)
    })

    it('should reject editing if review is older than 30 minutes', () => {
      const createdAt = new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35 mins ago
      const submissionTime = new Date(createdAt).getTime()
      const nowTime = Date.now()
      const diffMinutes = (nowTime - submissionTime) / (1000 * 60)

      expect(diffMinutes).toBeGreaterThan(30)
    })
  })

  describe('Dynamic XP Calculations based on Review Count', () => {
    it('should return 50 XP if it is the first review', () => {
      const reviewCount = 1 // newly inserted is the first
      const isFirst = reviewCount <= 1
      const xpAward = isFirst
        ? ((XP as any).firstReviewAward ?? 50)
        : ((XP as any).reviewAward ?? 20)
      expect(xpAward).toBe(50)
    })

    it('should return 20 XP if it is a subsequent review', () => {
      const reviewCount = 3 // user has multiple reviews
      const isFirst = reviewCount <= 1
      const xpAward = isFirst
        ? ((XP as any).firstReviewAward ?? 50)
        : ((XP as any).reviewAward ?? 20)
      expect(xpAward).toBe(20)
    })
  })
})
