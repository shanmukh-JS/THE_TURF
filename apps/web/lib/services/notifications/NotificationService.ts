import { notificationGateway } from './NotificationGateway'
import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationEvent =
  | 'BOOKING_CONFIRMED'
  | 'NEW_BOOKING'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_REMINDER_10_MIN'
  | 'BOOKING_COMPLETED_REVIEW_PROMPT'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED'
  | 'XP_EARNED'
  | 'LEVEL_UP'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'STREAK_COMPLETED'
  | 'SETTLEMENT_COMPLETED'
  | 'LOW_RATING_ALERT'
  | 'BUSINESS_SUGGESTION'

export interface EventPayload {
  bookingId?: string
  userId?: string
  ownerId?: string
  venueId?: string
  [key: string]: any
}

/**
 * Rich event configuration map — merges the best of the old Orchestrator
 * (category enrichment, icons, colors, priority) into the working pipeline.
 */
const EVENT_CONFIG: Record<
  string,
  {
    category: string
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SILENT'
    icon: string
    color: string
    actionText?: string
    deepLink?: string
    delayMs?: number
  }
> = {
  BOOKING_CONFIRMED: {
    category: 'BOOKINGS',
    priority: 'HIGH',
    icon: 'CalendarCheck',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    actionText: 'View Booking',
    deepLink: '/player/bookings',
  },
  NEW_BOOKING: {
    category: 'OWNER',
    priority: 'HIGH',
    icon: 'CalendarPlus',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    actionText: 'View Bookings',
    deepLink: '/owner/bookings',
  },
  BOOKING_CANCELLED: {
    category: 'BOOKINGS',
    priority: 'HIGH',
    icon: 'CalendarX',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    actionText: 'View Details',
    deepLink: '/player/bookings',
  },
  PAYMENT_SUCCESSFUL: {
    category: 'PAYMENTS',
    priority: 'HIGH',
    icon: 'CreditCard',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    actionText: 'View Receipt',
    deepLink: '/player/bookings',
  },
  PAYMENT_FAILED: {
    category: 'PAYMENTS',
    priority: 'CRITICAL',
    icon: 'AlertTriangle',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    actionText: 'Retry Payment',
    deepLink: '/player/bookings',
  },
  BOOKING_EXPIRED: {
    category: 'BOOKINGS',
    priority: 'MEDIUM',
    icon: 'Clock',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  BOOKING_REMINDER_10_MIN: {
    category: 'BOOKINGS',
    priority: 'HIGH',
    icon: 'AlarmClock',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    actionText: 'View Booking',
    deepLink: '/player/bookings',
  },
  BOOKING_COMPLETED_REVIEW_PROMPT: {
    category: 'BOOKINGS',
    priority: 'MEDIUM',
    icon: 'Star',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    actionText: 'Rate Now',
    deepLink: '/player/bookings',
  },
  REFUND_COMPLETED: {
    category: 'REFUNDS',
    priority: 'HIGH',
    icon: 'CreditCard',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    actionText: 'View Payments',
    deepLink: '/player/bookings',
  },
  REFUND_FAILED: {
    category: 'REFUNDS',
    priority: 'CRITICAL',
    icon: 'AlertCircle',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    actionText: 'Contact Support',
    deepLink: '/player/bookings',
  },
  XP_EARNED: {
    category: 'XP',
    priority: 'MEDIUM',
    icon: 'Award',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    actionText: 'View Profile',
    deepLink: '/player/profile',
    delayMs: 2000,
  },
  LEVEL_UP: {
    category: 'LEVELS',
    priority: 'HIGH',
    icon: 'Sparkles',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    actionText: 'Claim Rewards',
    deepLink: '/player/profile',
    delayMs: 4000,
  },
  ACHIEVEMENT_UNLOCKED: {
    category: 'ACHIEVEMENTS',
    priority: 'HIGH',
    icon: 'Trophy',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    actionText: 'View Achievement',
    deepLink: '/player/profile',
    delayMs: 3000,
  },
  STREAK_COMPLETED: {
    category: 'STREAKS',
    priority: 'MEDIUM',
    icon: 'Flame',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    actionText: 'View Streak',
    deepLink: '/player/profile',
  },
  SETTLEMENT_COMPLETED: {
    category: 'OWNER',
    priority: 'HIGH',
    icon: 'Banknote',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    actionText: 'View Financials',
    deepLink: '/owner/financials',
  },
  LOW_RATING_ALERT: {
    category: 'OWNER',
    priority: 'HIGH',
    icon: 'AlertTriangle',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    actionText: 'View Reviews',
    deepLink: '/owner/reviews',
  },
  BUSINESS_SUGGESTION: {
    category: 'OWNER',
    priority: 'MEDIUM',
    icon: 'Lightbulb',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    actionText: 'Optimize Slots',
    deepLink: '/owner/slots',
  },
}

/**
 * Rate limit rules per category (max notifications per user per day).
 */
const RATE_LIMITS: Record<string, number> = {
  PROMOTIONS: 3,
  SOCIAL: 5,
}

/**
 * Generate human-readable notification title and message per event type.
 */
function generateContent(
  event: NotificationEvent,
  payload: EventPayload
): { title: string; message: string } {
  switch (event) {
    case 'BOOKING_CONFIRMED':
      return {
        title: 'Booking Confirmed! 🏏',
        message: `Your slot at ${payload.venueName || 'the venue'} on ${payload.date || ''} (${payload.timeSlot || ''}) is secure. Enjoy the game!`,
      }
    case 'NEW_BOOKING':
      return {
        title: 'New Booking Received! 📋',
        message: `${payload.playerName || 'A player'} booked a slot at ${payload.venueName || 'your venue'} on ${payload.date || ''} (${payload.timeSlot || ''}). Amount: ₹${payload.amount || '0'}.`,
      }
    case 'BOOKING_CANCELLED':
      return {
        title: 'Booking Cancelled ❌',
        message: `Your booking at ${payload.venueName || 'the venue'} has been cancelled. Reason: ${payload.reason || 'N/A'}`,
      }
    case 'PAYMENT_SUCCESSFUL':
      return {
        title: 'Payment Successful 💳',
        message: `Payment of ₹${payload.amount || '0'} was successful for your booking.`,
      }
    case 'PAYMENT_FAILED':
      return {
        title: 'Payment Failed ⚠️',
        message: `Your payment of ₹${payload.amount || '0'} could not be processed. Please try again.`,
      }
    case 'BOOKING_EXPIRED':
      return {
        title: 'Booking Expired ⏰',
        message: `Your booking at ${payload.venueName || 'the venue'} has expired due to incomplete payment.`,
      }
    case 'BOOKING_REMINDER_10_MIN':
      return {
        title: 'Game Starts in 10 Minutes! ⏰',
        message: `Your game at ${payload.venueName || 'the venue'} starts soon (${payload.timeSlot || ''}). Head to the venue now!`,
      }
    case 'BOOKING_COMPLETED_REVIEW_PROMPT':
      return {
        title: '🎉 Match Completed!',
        message: `Your game at ${payload.venueName || 'the venue'} has ended. Rate your experience and earn up to +50 XP!`,
      }
    case 'REFUND_COMPLETED':
      return {
        title: 'Refund Completed 💳',
        message: `₹${payload.amount || '0'} has been credited to your account.${payload.reference ? ` Reference: ${payload.reference}` : ''}`,
      }
    case 'REFUND_FAILED':
      return {
        title: 'Refund Failed ⚠️',
        message: `Your refund could not be processed. Our team will review this shortly. ${payload.error ? `Error: ${payload.error}` : ''}`,
      }
    case 'XP_EARNED':
      return {
        title: `🎉 +${payload.xpEarned || 0} XP Earned!`,
        message: `Only ${payload.remainingXp || '?'} XP left until Level ${payload.nextLevel || '?'}. Keep the streak active!`,
      }
    case 'LEVEL_UP':
      return {
        title: `🏆 Level Up! Level ${payload.level || '?'} Unlocked`,
        message: `Congratulations! New badge unlocked. Claim your premium slot discounts now!`,
      }
    case 'ACHIEVEMENT_UNLOCKED':
      return {
        title: `🏅 Achievement Unlocked: ${payload.achievementName || 'New Achievement'}`,
        message: `You unlocked ${payload.achievementName || 'an achievement'}! Keep up the great work.`,
      }
    case 'STREAK_COMPLETED':
      return {
        title: `🔥 ${payload.streakDays || '?'}-Day Streak Logged!`,
        message: `Keep the streak alive! Book tomorrow to maintain your active streak.`,
      }
    case 'SETTLEMENT_COMPLETED':
      return {
        title: 'Settlement Processed 💰',
        message: `₹${payload.amount || '0'} has been settled to your bank account.`,
      }
    case 'LOW_RATING_ALERT':
      return {
        title: 'Low Rating Alert ⚠️',
        message: `Your turf average rating has dropped. Respond to recent reviews to build trust.`,
      }
    case 'BUSINESS_SUGGESTION':
      return {
        title: `💡 Smart Suggestion: ${payload.suggestionTitle || 'Optimize'}`,
        message: payload.suggestionDescription || 'Check your dashboard for optimization tips.',
      }
    default:
      return {
        title: (event as string).replace(/_/g, ' '),
        message: payload.message || '',
      }
  }
}

export class NotificationService {
  /**
   * Publishes a notification event through the Gateway → BullMQ → Worker pipeline.
   * Includes rate limiting, rich category mapping, and staggered delivery for gamification events.
   */
  async publishEvent(event: NotificationEvent, payload: EventPayload): Promise<void> {
    const userId = payload.userId || payload.ownerId
    if (!userId) return

    const config = EVENT_CONFIG[event] || {
      category: 'SYSTEM',
      priority: 'MEDIUM' as const,
      icon: 'Info',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    }

    // Rate limiting check
    const rateLimitMax = RATE_LIMITS[config.category]
    if (rateLimitMax) {
      const exceeded = await this.isRateLimited(userId, config.category, rateLimitMax)
      if (exceeded) {
        console.log(
          `[NotificationService] Rate limit exceeded for user ${userId}, category ${config.category}. Skipping.`
        )
        return
      }
    }

    // Generate content
    const { title, message } = generateContent(event, payload)

    // Build the dispatch function
    const dispatchFn = async () => {
      await notificationGateway.dispatch('IN_APP', event, {
        userId,
        title,
        message,
        category: config.category,
        priority: config.priority,
        icon: config.icon,
        color: config.color,
        actionButton: !!config.actionText,
        actionText: config.actionText,
        metadata: {
          ...payload,
          deepLink: config.deepLink,
        },
      })
    }

    // Staggered delivery for gamification events
    if (config.delayMs && config.delayMs > 0) {
      setTimeout(dispatchFn, config.delayMs)
    } else {
      await dispatchFn()
    }
  }

  /**
   * Check if the daily notification rate limit has been exceeded for a category.
   */
  private async isRateLimited(
    userId: string,
    category: string,
    maxPerDay: number
  ): Promise<boolean> {
    try {
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
      return (count || 0) >= maxPerDay
    } catch {
      return false
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService
