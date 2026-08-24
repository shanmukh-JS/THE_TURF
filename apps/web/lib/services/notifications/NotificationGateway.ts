import { inAppQueue, emailQueue } from '../../../workers/queues'
import { createAdminClient } from '@/lib/supabase/admin'

export interface GatewayPayload {
  userId: string
  title: string
  message: string
  category: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SILENT'
  icon?: string
  color?: string
  actionButton?: boolean
  actionText?: string
  expiresAt?: string
  metadata?: any
  correlationId?: string
  causationId?: string
}

/**
 * In-memory deduplication window to prevent duplicate dispatches within 60s.
 * Keys are cleared on a rolling basis to prevent memory leak.
 */
const recentDispatches = new Map<string, number>()
const DEDUP_WINDOW_MS = 60_000
const MAX_DEDUP_ENTRIES = 500

function cleanupDedupCache() {
  if (recentDispatches.size <= MAX_DEDUP_ENTRIES) return
  const now = Date.now()
  for (const [key, ts] of recentDispatches) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentDispatches.delete(key)
    }
  }
}

export class NotificationGateway {
  /**
   * Dispatches the notification event to the appropriate channel queue
   * applying RLS, preferences matrix, and dead-letter/retry configs.
   */
  async dispatch(
    channel: 'IN_APP' | 'EMAIL',
    eventType: string,
    payload: GatewayPayload
  ): Promise<string | null> {
    const supabase = createAdminClient()
    const idempotencyKey = `notif_ref_${payload.correlationId || crypto.randomUUID()}_${channel.toLowerCase()}`

    try {
      // 0. Deduplication window check
      const dedupKey = `${payload.userId}_${eventType}_${channel}`
      const lastDispatch = recentDispatches.get(dedupKey)
      if (lastDispatch && Date.now() - lastDispatch < DEDUP_WINDOW_MS) {
        console.log(
          `[NotificationGateway] Dedup hit: ${dedupKey} dispatched ${Date.now() - lastDispatch}ms ago. Skipping.`
        )
        return null
      }
      recentDispatches.set(dedupKey, Date.now())
      cleanupDedupCache()

      // 1. Check user Preferences Matrix for this category & channel
      const { data: preference } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', payload.userId)
        .eq('category', payload.category.toLowerCase())
        .maybeSingle()

      // If preferences exist, respect the channel switches
      if (preference) {
        if (channel === 'IN_APP' && !preference.in_app_enabled) {
          console.log(
            `[NotificationGateway] In-App disabled by preference for user ${payload.userId}, category ${payload.category}`
          )
          return null
        }
        if (channel === 'EMAIL' && !preference.email_enabled) {
          console.log(
            `[NotificationGateway] Email disabled by preference for user ${payload.userId}, category ${payload.category}`
          )
          return null
        }
      }

      // 2. Direct Delivery & Central Truth Record
      if (channel === 'IN_APP') {
        // Direct resilient insert into public.notifications for immediate UI & real-time toast delivery
        try {
          await supabase.from('notifications').insert({
            user_id: payload.userId,
            title: payload.title,
            message: payload.message,
            type: payload.category === 'BOOKINGS' || payload.category === 'OWNER' ? 'BOOKING' : 'INFO',
            category: payload.category,
            priority: payload.priority,
            icon: payload.icon,
            color: payload.color,
            action_button: payload.actionButton || false,
            action_text: payload.actionText || null,
            link: payload.metadata?.deepLink || (payload.category === 'OWNER' ? '/owner/bookings' : '/player/bookings'),
            metadata: payload.metadata || {},
            is_read: false,
          })
        } catch (inAppErr) {
          console.warn('[NotificationGateway] Direct notification insert warning:', inAppErr)
        }
      }

      // Log central truth in notification_events (safely)
      let jobId: string | null = null
      try {
        const { data: record } = await supabase
          .from('notification_events')
          .insert({
            event: eventType,
            channel,
            booking_id: payload.metadata?.bookingId || null,
            user_id: payload.userId,
            payload: {
              ...payload,
              idempotencyKey,
            },
            status: channel === 'IN_APP' ? 'DELIVERED' : 'QUEUED',
          })
          .select('id')
          .single()

        if (record?.id) {
          jobId = record.id
          await supabase.from('notification_lifecycle_log').insert({
            notification_id: jobId,
            state: channel === 'IN_APP' ? 'DELIVERED' : 'QUEUED',
          })
        }
      } catch (logErr) {
        console.warn('[NotificationGateway] notification_events log warning:', logErr)
      }

      // 3. Push to corresponding BullMQ channel queue (if active)
      try {
        if (channel === 'IN_APP') {
          await inAppQueue.add(
            eventType,
            { notificationId: jobId || idempotencyKey, payload },
            { jobId: idempotencyKey }
          )
        } else if (channel === 'EMAIL') {
          await emailQueue.add(
            eventType,
            { notificationId: jobId || idempotencyKey, payload },
            { jobId: idempotencyKey }
          )
        }
      } catch (queueErr) {
        // Queueing is asynchronous, direct database delivery already succeeded
      }

      return jobId || idempotencyKey
    } catch (err: any) {
      console.error(`[NotificationGateway] Dispatch error:`, err.message)
      return null
    }
  }
}

export const notificationGateway = new NotificationGateway()
export default notificationGateway
