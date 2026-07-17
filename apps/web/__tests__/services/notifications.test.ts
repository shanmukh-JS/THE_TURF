import { describe, it, expect, vi, beforeEach } from 'vitest'
import { domainEventBus } from '../../lib/services/notifications/DomainEventBus'
import { notificationOrchestrator } from '../../lib/services/notifications/NotificationOrchestrator'
import { notificationGateway } from '../../lib/services/notifications/NotificationGateway'

// Mock admin client queries since we aren't using a real remote DB in this unit test
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-job-id' }, error: null }),
    })),
  })),
}))

describe('Smart Notification System Platform Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    // Force orchestrator evaluation to register listeners
    expect(notificationOrchestrator).toBeDefined()
  })

  it('should translate domain events into structured display events', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    // Publish BookingConfirmed event to the Bus
    domainEventBus.publish('BookingConfirmed.v1', {
      userId: 'user-123',
      venueName: 'Green Arena',
      date: '2026-07-18',
      timeSlot: '6 PM - 7 PM',
      amount: 1500,
      bookingId: 'booking-999',
    })

    // Assert that the orchestrator translates it and calls gateway dispatch
    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'SHOW_BOOKING_CONFIRMATION',
      expect.objectContaining({
        userId: 'user-123',
        category: 'BOOKINGS',
        priority: 'HIGH',
        icon: 'CalendarCheck',
      })
    )
  })

  it('should apply correct stagger delays to XP rewards', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    // Publish XPGranted event to the Bus
    domainEventBus.publish('XPGranted.v1', {
      userId: 'user-123',
      xpEarned: 250,
      currentXp: 950,
      remainingXp: 50,
      nextLevel: 2,
    })

    // XP has a 2-second stagger delay, so it shouldn't have been dispatched immediately
    expect(dispatchSpy).not.toHaveBeenCalled()

    // Advance timers by 2 seconds
    await vi.advanceTimersByTimeAsync(2000)

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'SHOW_XP_GAIN',
      expect.objectContaining({
        userId: 'user-123',
        category: 'XP',
        priority: 'MEDIUM',
      })
    )
  })

  it('should apply level up stagger delay sequence correctly', async () => {
    const dispatchSpy = vi.spyOn(notificationGateway, 'dispatch').mockResolvedValue('job-123')

    // Publish LevelUp event to the Bus
    domainEventBus.publish('LevelUp.v1', {
      userId: 'user-123',
      level: 5,
    })

    expect(dispatchSpy).not.toHaveBeenCalled()

    // LevelUp has a 4-second stagger delay
    await vi.advanceTimersByTimeAsync(4000)

    expect(dispatchSpy).toHaveBeenCalledWith(
      'IN_APP',
      'SHOW_LEVEL_PROGRESS',
      expect.objectContaining({
        userId: 'user-123',
        category: 'LEVELS',
        priority: 'HIGH',
      })
    )
  })
})
