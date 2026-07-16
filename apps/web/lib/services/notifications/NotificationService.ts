import { createAdminClient } from '@/lib/supabase/admin'
import { emailQueue, inAppQueue, reminderQueue } from '../../../workers/queues'

export type NotificationEvent =
  | 'BOOKING_CONFIRMED'
  | 'NEW_BOOKING'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_REMINDER_10_MIN'
  | 'BOOKING_COMPLETED_REVIEW_PROMPT'

export interface EventPayload {
  bookingId?: string
  userId?: string
  ownerId?: string
  venueId?: string
  [key: string]: any
}

export class NotificationService {
  /**
   * Publishes a domain event. The service decides which channels to route to
   * based on preferences, and pushes jobs to the appropriate BullMQ queues.
   */
  async publishEvent(event: NotificationEvent, payload: EventPayload): Promise<void> {
    const supabase = createAdminClient()

    // Default channels for Phase 1 MVP
    const channels: ('EMAIL' | 'IN_APP')[] = ['EMAIL', 'IN_APP']

    for (const channel of channels) {
      // 1. Create the central truth record in notification_events
      const { data: record, error } = await supabase
        .from('notification_events')
        .insert({
          event,
          channel,
          booking_id: payload.bookingId || null,
          user_id: payload.userId || null,
          payload,
          status: 'QUEUED',
        })
        .select('id')
        .single()

      if (error || !record) {
        console.error(`[NotificationService] Failed to create event record:`, error)
        continue
      }

      const jobId = record.id

      // 2. Push to the correct BullMQ Queue
      if (channel === 'EMAIL') {
        await emailQueue.add(event, { notificationId: jobId, payload }, { jobId })
      } else if (channel === 'IN_APP') {
        await inAppQueue.add(event, { notificationId: jobId, payload }, { jobId })
      }
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService
