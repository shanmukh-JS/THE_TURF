import { createAdminClient } from '@/lib/supabase/admin'

export interface DomainEvent<T = any> {
  eventType: string
  version: number
  payload: T
  bookingId?: string
  userId?: string
}

class EventBus {
  /**
   * Publishes a domain event by persisting it to the transactional outbox table in the database.
   * This handles the Next.js serverless environment restriction where in-memory emitters fail.
   */
  async publish(event: DomainEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createAdminClient()
      const { eventType, version, payload, bookingId, userId } = event

      // Idempotency Key mapping: bookingId_eventType_version OR random UUID if no bookingId
      const targetId = bookingId || userId || crypto.randomUUID()
      const idempotencyKey = `${targetId}_${eventType}_v${version}`

      // Determine priority based on event type
      let priority = 'MEDIUM'
      if (eventType.startsWith('auth.login')) {
        priority = 'CRITICAL'
      } else if (
        eventType.startsWith('booking.confirmed') ||
        eventType.startsWith('payment.success')
      ) {
        priority = 'HIGH'
      } else if (eventType.startsWith('marketing')) {
        priority = 'LOW'
      }

      const { error } = await supabase.from('notification_outbox').insert({
        event_type: `${eventType}.v${version}`,
        payload: {
          ...payload,
          bookingId,
          userId,
        },
        idempotency_key: idempotencyKey,
        priority,
        status: 'PENDING',
      })

      if (error) {
        // If it's a duplicate key error (P2002 or 23505), it's already logged. Ignore to guarantee idempotency.
        if (error.code === '23505') {
          console.warn(`Duplicate event ignored for idempotency: ${idempotencyKey}`)
          return { success: true }
        }
        throw error
      }

      return { success: true }
    } catch (e: any) {
      console.error(`Failed to publish event ${event.eventType} to outbox:`, e)
      return { success: false, error: e.message || 'Unknown error' }
    }
  }
}

export const globalEventBus = new EventBus()
export default globalEventBus
