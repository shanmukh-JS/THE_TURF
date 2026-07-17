import { inAppQueue, emailQueue, reminderQueue } from '../../../workers/queues'
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

      // 2. Create the central truth record in notification_events (Lifecycle: CREATED -> QUEUED)
      const { data: record, error } = await supabase
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
          status: 'QUEUED',
        })
        .select('id')
        .single()

      if (error || !record) {
        throw new Error(
          `Failed to insert notification_events log: ${error?.message || 'Empty record'}`
        )
      }

      const jobId = record.id

      // 3. Track state changes inside notification_lifecycle_log
      await supabase.from('notification_lifecycle_log').insert({
        notification_id: jobId,
        state: 'QUEUED',
      })

      // 4. Push to corresponding BullMQ channel queue with custom deduplication keys
      if (channel === 'IN_APP') {
        await inAppQueue.add(
          eventType,
          { notificationId: jobId, payload },
          { jobId: idempotencyKey }
        )
      } else if (channel === 'EMAIL') {
        await emailQueue.add(
          eventType,
          { notificationId: jobId, payload },
          { jobId: idempotencyKey }
        )
      }

      return jobId
    } catch (err: any) {
      console.error(`[NotificationGateway] Dispatch error:`, err.message)
      return null
    }
  }
}

export const notificationGateway = new NotificationGateway()
export default notificationGateway
