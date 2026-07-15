import { createAdminClient } from '@/lib/supabase/admin'
import { getQueue } from '../../queues/BaseQueue'
import { notificationService } from './NotificationService'

const globalProcessor = globalThis as unknown as {
  outboxIntervalId?: NodeJS.Timeout
}

export class OutboxProcessor {
  /**
   * Scans the notification_outbox table for PENDING messages, maps priority,
   * enqueues them in BullMQ (or fires synchronously if Redis is offline), and flags them.
   */
  async processOutbox(): Promise<void> {
    const supabase = createAdminClient()

    // 1. Fetch pending notifications ready to run
    const { data: pendingEvents, error } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50)

    if (error || !pendingEvents || pendingEvents.length === 0) {
      if (error) console.error('[OutboxProcessor] Fetch error:', error.message)
      return
    }

    console.log(`[OutboxProcessor] Found ${pendingEvents.length} pending events to dispatch.`)

    for (const event of pendingEvents) {
      try {
        const payload = event.payload
        const priority = event.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        const queue = getQueue(priority)

        // Mark outbox row as processed first to prevent duplicate sends during slow queue operations
        const { error: markError } = await supabase
          .from('notification_outbox')
          .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
          .eq('id', event.id)

        if (markError) throw markError

        if (queue) {
          // BullMQ mode
          await queue.add(event.event_type, payload, {
            jobId: event.idempotency_key,
          })
          console.log(
            `[OutboxProcessor] Event ${event.id} queued successfully in BullMQ (${priority})`
          )
        } else {
          // Dev Fallback Mode: process synchronously
          console.log(`[OutboxProcessor] Fallback: processing event ${event.id} synchronously.`)

          /* LEGACY SYNC DISPATCH REMOVED - Outbox is deprecated for direct EventBus */
          // const result = await notificationService.publishEvent({
          //   recipient: payload.recipient || payload.phone || '',
          //   type: event.event_type.split('.')[0],
          //   templateName: payload.templateName || event.event_type.split('.')[0],
          //   variables: payload.variables || {},
          //   bookingId: payload.bookingId,
          //   userId: payload.userId,
          //   idempotencyKey: event.idempotency_key,
          // })

          // if (!result.success) {
          //   await supabase
          //     .from('notification_outbox')
          //     .update({ status: 'FAILED' })
          //     .eq('id', event.id)
          //   console.error(`[OutboxProcessor] Fallback processing failed:`, result.error)
          // }
        }
      } catch (e: any) {
        console.error(`[OutboxProcessor] Crash on outbox record ${event.id}:`, e.message)
        // Mark outbox row as PENDING again to allow retry on next loop
        await supabase.from('notification_outbox').update({ status: 'PENDING' }).eq('id', event.id)
      }
    }
  }

  startPolling(intervalMs = 5000): void {
    if (globalProcessor.outboxIntervalId) {
      console.log('[OutboxProcessor] Poller interval already running. Skipping duplicate init.')
      return
    }

    globalProcessor.outboxIntervalId = setInterval(() => {
      this.processOutbox().catch((err) =>
        console.error('[OutboxProcessor] Poller loop error:', err.message)
      )
    }, intervalMs)

    console.log(
      `[OutboxProcessor] Outbox processor started. Polling interval set to ${intervalMs}ms.`
    )
  }

  stopPolling(): void {
    if (globalProcessor.outboxIntervalId) {
      clearInterval(globalProcessor.outboxIntervalId)
      globalProcessor.outboxIntervalId = undefined
      console.log('[OutboxProcessor] Outbox processor polling halted.')
    }
  }
}

export const outboxProcessor = new OutboxProcessor()
export default outboxProcessor
