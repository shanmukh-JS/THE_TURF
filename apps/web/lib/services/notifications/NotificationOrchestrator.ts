import { domainEventBus, DomainEvent } from './DomainEventBus'
import { notificationGateway } from './NotificationGateway'
import { createAdminClient } from '@/lib/supabase/admin'

class NotificationOrchestrator {
  private static instance: NotificationOrchestrator

  private constructor() {
    this.setupListeners()
  }

  public static getInstance(): NotificationOrchestrator {
    if (!NotificationOrchestrator.instance) {
      NotificationOrchestrator.instance = new NotificationOrchestrator()
    }
    return NotificationOrchestrator.instance
  }

  private setupListeners() {
    console.log('[NotificationOrchestrator] Initializing domain event listeners...')

    // 1. Booking Confirmed
    domainEventBus.on('BookingConfirmed.v1', async (event: DomainEvent) => {
      await this.orchestrateBookingConfirmation(event)
    })

    // 2. XP Granted (Staggered by 2 seconds behind bookings/payments)
    domainEventBus.on('XPGranted.v1', async (event: DomainEvent) => {
      setTimeout(async () => {
        await this.orchestrateXpReward(event)
      }, 2000)
    })

    // 3. Level Up (Staggered by 4 seconds behind bookings/payments)
    domainEventBus.on('LevelUp.v1', async (event: DomainEvent) => {
      setTimeout(async () => {
        await this.orchestrateLevelUp(event)
      }, 4000)
    })

    // 4. Refund Completed
    domainEventBus.on('RefundCompleted.v1', async (event: DomainEvent) => {
      await this.orchestrateRefundCompletion(event)
    })

    // 5. Smart Business Suggestions (Owner alert)
    domainEventBus.on('BusinessSuggestion.v1', async (event: DomainEvent) => {
      await this.orchestrateBusinessSuggestion(event)
    })
  }

  /**
   * Helper to check daily rate limits per category
   */
  private async checkRateLimit(userId: string, category: string): Promise<boolean> {
    const supabase = createAdminClient()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', category)
      .gt('created_at', todayStart.toISOString())

    if (error) return false

    // Limit rules:
    // PROMOTIONS -> max 3 per day
    // SYSTEM/SECURITY -> unlimited
    if (category === 'PROMOTIONS' && (count || 0) >= 3) return true
    if (category === 'SOCIAL' && (count || 0) >= 5) return true

    return false
  }

  private async orchestrateBookingConfirmation(event: DomainEvent) {
    const { userId, venueName, date, timeSlot, amount, bookingId } = event.payload

    await notificationGateway.dispatch('IN_APP', 'SHOW_BOOKING_CONFIRMATION', {
      userId,
      title: 'Booking Confirmed! 🏏',
      message: `Your slot at ${venueName} on ${date} (${timeSlot}) is secure. Enjoy the game!`,
      category: 'BOOKINGS',
      priority: 'HIGH',
      icon: 'CalendarCheck',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      actionButton: true,
      actionText: 'View Booking',
      metadata: { bookingId, deepLink: `/player/bookings` },
      correlationId: event.correlationId,
      causationId: event.eventId,
    })
  }

  private async orchestrateXpReward(event: DomainEvent) {
    const { userId, xpEarned, remainingXp, nextLevel, currentXp } = event.payload

    await notificationGateway.dispatch('IN_APP', 'SHOW_XP_GAIN', {
      userId,
      title: `🎉 +${xpEarned} XP Earned!`,
      message: `Only ${remainingXp} XP left until Level ${nextLevel}. Keep the streak active!`,
      category: 'XP',
      priority: 'MEDIUM',
      icon: 'Award',
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      actionButton: true,
      actionText: 'View Profile',
      metadata: {
        xpEarned,
        currentXp,
        remainingXp,
        nextLevel,
        deepLink: `/player/profile`,
      },
      correlationId: event.correlationId,
      causationId: event.eventId,
    })
  }

  private async orchestrateLevelUp(event: DomainEvent) {
    const { userId, level } = event.payload

    await notificationGateway.dispatch('IN_APP', 'SHOW_LEVEL_PROGRESS', {
      userId,
      title: `🏆 Level Up! Level ${level} Unlocked`,
      message: `Congratulations! New badge unlocked. Claim your premium slot discounts now!`,
      category: 'LEVELS',
      priority: 'HIGH',
      icon: 'Sparkles',
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      actionButton: true,
      actionText: 'Claim Rewards',
      metadata: { level, deepLink: `/player/profile` },
      correlationId: event.correlationId,
      causationId: event.eventId,
    })
  }

  private async orchestrateRefundCompletion(event: DomainEvent) {
    const { userId, amount, reference } = event.payload

    await notificationGateway.dispatch('IN_APP', 'SHOW_REFUND_RECEIPT', {
      userId,
      title: 'Refund Completed 💳',
      message: `₹${amount} has been credited to your account. Reference ID: ${reference}.`,
      category: 'REFUNDS',
      priority: 'HIGH',
      icon: 'CreditCard',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      actionButton: true,
      actionText: 'View Payments',
      metadata: { amount, deepLink: `/player/payments` },
      correlationId: event.correlationId,
      causationId: event.eventId,
    })
  }

  private async orchestrateBusinessSuggestion(event: DomainEvent) {
    const { ownerId, suggestionTitle, suggestionDescription } = event.payload

    await notificationGateway.dispatch('IN_APP', 'SHOW_BUSINESS_SUGGESTION', {
      userId: ownerId,
      title: `💡 Smart Suggestion: ${suggestionTitle}`,
      message: suggestionDescription,
      category: 'OWNER',
      priority: 'HIGH',
      icon: 'Lightbulb',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      actionButton: true,
      actionText: 'Optimize Slots',
      metadata: { deepLink: `/owner/slots` },
      correlationId: event.correlationId,
      causationId: event.eventId,
    })
  }
}

export const notificationOrchestrator = NotificationOrchestrator.getInstance()
export default notificationOrchestrator
