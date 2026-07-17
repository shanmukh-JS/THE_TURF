import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService } from '../../lib/services/notifications/NotificationService'
import { notificationGateway } from '../../lib/services/notifications/NotificationGateway'

// Mock admin client queries since we aren't using a real remote DB in this unit test
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          gt: vi.fn().mockResolvedValue({ count: 0, error: null }),
        })),
      })),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-job-id' }, error: null }),
        }),
      }),
    })),
  })),
}))

// Mock the queues to prevent Redis connection errors in tests
vi.mock('../../../workers/queues', () => ({
  inAppQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
  emailQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}))

describe('Unified Notification Service Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  it('should dispatch BOOKING_CONFIRMED with correct category and priority', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    await notificationService.publishEvent('BOOKING_CONFIRMED', {
      userId: 'user-123',
      venueName: 'Green Arena',
      date: '2026-07-18',
      timeSlot: '6 PM - 7 PM',
      amount: '1500',
      bookingId: 'booking-999',
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'BOOKING_CONFIRMED',
      expect.objectContaining({
        userId: 'user-123',
        category: 'BOOKINGS',
        priority: 'HIGH',
        icon: 'CalendarCheck',
        title: 'Booking Confirmed! 🏏',
      })
    )
  })

  it('should apply stagger delay for XP_EARNED notifications (2s)', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    await notificationService.publishEvent('XP_EARNED', {
      userId: 'user-123',
      xpEarned: 250,
      currentXp: 950,
      remainingXp: 50,
      nextLevel: 2,
    })

    // XP_EARNED has a 2-second stagger delay, so it shouldn't fire immediately
    expect(dispatchSpy).not.toHaveBeenCalled()

    // Advance timers by 2 seconds
    await vi.advanceTimersByTimeAsync(2000)

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'XP_EARNED',
      expect.objectContaining({
        userId: 'user-123',
        category: 'XP',
        priority: 'MEDIUM',
        icon: 'Award',
      })
    )
  })

  it('should apply stagger delay for LEVEL_UP notifications (4s)', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    await notificationService.publishEvent('LEVEL_UP', {
      userId: 'user-123',
      level: 5,
    })

    expect(dispatchSpy).not.toHaveBeenCalled()

    // LEVEL_UP has a 4-second stagger delay
    await vi.advanceTimersByTimeAsync(4000)

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'LEVEL_UP',
      expect.objectContaining({
        userId: 'user-123',
        category: 'LEVELS',
        priority: 'HIGH',
        icon: 'Sparkles',
      })
    )
  })

  it('should dispatch REFUND_COMPLETED with correct messaging', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-456')

    await notificationService.publishEvent('REFUND_COMPLETED', {
      userId: 'user-123',
      amount: '500',
      reference: 'REF-123',
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'REFUND_COMPLETED',
      expect.objectContaining({
        userId: 'user-123',
        category: 'REFUNDS',
        priority: 'HIGH',
        title: 'Refund Completed 💳',
        message: expect.stringContaining('₹500'),
      })
    )
  })

  it('should dispatch NEW_BOOKING to owner with OWNER category', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-789')

    await notificationService.publishEvent('NEW_BOOKING', {
      userId: 'owner-456',
      playerName: 'John',
      venueName: 'Green Arena',
      date: '2026-07-18',
      timeSlot: '6 PM - 7 PM',
      amount: '1200',
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'NEW_BOOKING',
      expect.objectContaining({
        userId: 'owner-456',
        category: 'OWNER',
        priority: 'HIGH',
        icon: 'CalendarPlus',
        title: 'New Booking Received! 📋',
      })
    )
  })

  it('should skip notification if no userId provided', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-000')

    await notificationService.publishEvent('BOOKING_CONFIRMED', {
      venueName: 'Green Arena',
    })

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
