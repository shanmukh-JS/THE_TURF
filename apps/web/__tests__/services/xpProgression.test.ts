import { describe, it, expect, vi, beforeEach } from 'vitest'
import { XpService } from '@/lib/services/xpService'
import { XP } from '@/config/settings'

describe('XP & Level Progression System', () => {
  let xpService: XpService
  let mockSupabase: any
  let mockMaybeSingle: any
  let mockUpdate: any
  let mockInsert: any

  beforeEach(() => {
    xpService = new XpService()
    mockMaybeSingle = vi.fn()
    mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        single: mockMaybeSingle,
        update: mockUpdate,
        insert: mockInsert,
      }),
    }
    vi.clearAllMocks()
  })

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(xpService.calculateLevel(0)).toBe(1)
    })

    it('should return level 1 for XP below 1000', () => {
      expect(xpService.calculateLevel(500)).toBe(1)
      expect(xpService.calculateLevel(999)).toBe(1)
    })

    it('should return level 2 for exactly 1000 XP', () => {
      expect(xpService.calculateLevel(1000)).toBe(2)
    })

    it('should calculate correct level for higher XP', () => {
      expect(xpService.calculateLevel(2500)).toBe(3)
      expect(xpService.calculateLevel(10000)).toBe(11)
    })

    it('should clamp level to a maximum of 50', () => {
      expect(xpService.calculateLevel(49000)).toBe(50)
      expect(xpService.calculateLevel(50000)).toBe(50)
      expect(xpService.calculateLevel(100000)).toBe(50)
    })

    it('should never return a level below 1 even for negative input', () => {
      expect(xpService.calculateLevel(-500)).toBe(1)
    })
  })

  describe('awardXpForBooking', () => {
    it('should award 250 XP on successful booking and level up correctly', async () => {
      // First call to maybeSingle (checking if BOOKED log exists) -> null
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Second call to maybeSingle (fetching customer profile) -> XP = 900, Level = 1
      mockMaybeSingle.mockResolvedValueOnce({ data: { xp: 900, level: 1 }, error: null })

      const result = await xpService.awardXpForBooking(mockSupabase, 'user-123', 'booking-456')

      expect(result.success).toBe(true)
      expect(result.levelUp).toBe(true) // 900 + 250 = 1150 (Level 2)
      expect(result.xp).toBe(1150)
      expect(result.level).toBe(2)

      // Verify DB updates
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_profiles')
      expect(mockUpdate).toHaveBeenCalledWith({ xp: 1150, level: 2 })
      expect(mockSupabase.from).toHaveBeenCalledWith('xp_audit_logs')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        booking_id: 'booking-456',
        action: 'BOOKED',
        xp_before: 900,
        xp_change: XP.bookingAward,
        xp_after: 1150,
        level_before: 1,
        level_after: 2,
      })
    })

    it('should award XP without level up if total XP does not cross boundary', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockMaybeSingle.mockResolvedValueOnce({ data: { xp: 100, level: 1 }, error: null })

      const result = await xpService.awardXpForBooking(mockSupabase, 'user-123', 'booking-456')

      expect(result.success).toBe(true)
      expect(result.levelUp).toBe(false) // 100 + 250 = 350 (still Level 1)
      expect(result.xp).toBe(350)
      expect(result.level).toBe(1)
    })

    it('should implement idempotency and ignore duplicate booking rewards', async () => {
      // Mock existing BOOKED log found
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log-1' }, error: null })

      const result = await xpService.awardXpForBooking(mockSupabase, 'user-123', 'booking-456')

      expect(result.success).toBe(false)
      expect(result.reason).toBe('Duplicate booking request ignored.')
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('deductXpForCancellation', () => {
    it('should deduct 250 XP and decrease level if below boundary', async () => {
      // Mock that booking was previously confirmed
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'booked-log' }, error: null })
      // Mock no existing cancellation log
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Mock profile state (XP = 1150, Level = 2)
      mockMaybeSingle.mockResolvedValueOnce({ data: { xp: 1150, level: 2 }, error: null })

      const result = await xpService.deductXpForCancellation(
        mockSupabase,
        'user-123',
        'booking-456'
      )

      expect(result.success).toBe(true)
      expect(result.xp).toBe(900)
      expect(result.level).toBe(1) // level goes from 2 to 1

      // Verify DB updates
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_profiles')
      expect(mockUpdate).toHaveBeenCalledWith({ xp: 900, level: 1 })
      expect(mockSupabase.from).toHaveBeenCalledWith('xp_audit_logs')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        booking_id: 'booking-456',
        action: 'CANCELLED',
        xp_before: 1150,
        xp_change: -XP.bookingAward,
        xp_after: 900,
        level_before: 2,
        level_after: 1,
      })
    })

    it('should clamp XP to 0 and level to 1, never going negative', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'booked-log' }, error: null })
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Mock profile state has only 100 XP
      mockMaybeSingle.mockResolvedValueOnce({ data: { xp: 100, level: 1 }, error: null })

      const result = await xpService.deductXpForCancellation(
        mockSupabase,
        'user-123',
        'booking-456'
      )

      expect(result.success).toBe(true)
      expect(result.xp).toBe(0) // 100 - 250 is clamped to 0
      expect(result.level).toBe(1) // level never falls below 1
    })

    it('should implement idempotency and ignore duplicate cancellation requests', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'booked-log' }, error: null })
      // Mock existing CANCELLED log found
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'cancelled-log' }, error: null })

      const result = await xpService.deductXpForCancellation(
        mockSupabase,
        'user-123',
        'booking-456'
      )

      expect(result.success).toBe(false)
      expect(result.reason).toBe('Duplicate cancellation request ignored.')
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should prevent deduction if booking was never awarded XP', async () => {
      // Mock no booked log found
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await xpService.deductXpForCancellation(
        mockSupabase,
        'user-123',
        'booking-456'
      )

      expect(result.success).toBe(false)
      expect(result.reason).toBe('No booking XP log found to deduct.')
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})
