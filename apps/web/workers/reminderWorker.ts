import { Worker, Job } from 'bullmq'
import { connection, QUEUES, emailQueue, inAppQueue } from './queues'
import { createAdminClient } from '@/lib/supabase/admin'

export const reminderWorker = new Worker(
  QUEUES.REMINDER,
  async (job: Job) => {
    const { event, payload } = job.data
    const supabase = createAdminClient()

    try {
      const bookingId = payload.bookingId
      const reminderType = event // e.g., 'BOOKING_REMINDER_10_MIN'

      if (!bookingId) throw new Error('No bookingId provided for reminder')

      // 1. Idempotency Check: Did we already send this exact reminder?
      const { data: existingLog, error: logError } = await supabase
        .from('reminder_logs')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reminder_type', reminderType)
        .maybeSingle()

      if (existingLog) {
        console.log(
          `[ReminderWorker] Reminder ${reminderType} for booking ${bookingId} already sent. Skipping.`
        )
        return { success: true, skipped: true }
      }

      // 2. Lock it in (prevent race conditions by inserting now)
      const { error: insertError } = await supabase.from('reminder_logs').insert({
        booking_id: bookingId,
        reminder_type: reminderType,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - another worker just inserted it!
          console.log(
            `[ReminderWorker] Race condition caught: Reminder ${reminderType} for booking ${bookingId} already sent.`
          )
          return { success: true, skipped: true }
        }
        throw insertError
      }

      // 3. Delegate to Email and In-App Queues
      // We leverage our existing abstract pipelines for the actual delivery!

      const { data: record, error: eventError } = await supabase
        .from('notification_events')
        .insert({
          event,
          channel: 'EMAIL',
          booking_id: bookingId,
          user_id: payload.userId || null,
          payload,
          status: 'QUEUED',
        })
        .select('id')
        .single()

      if (!eventError && record) {
        await emailQueue.add(event, { notificationId: record.id, payload }, { jobId: record.id })
      }

      const { data: inAppRecord, error: inAppError } = await supabase
        .from('notification_events')
        .insert({
          event,
          channel: 'IN_APP',
          booking_id: bookingId,
          user_id: payload.userId || null,
          payload,
          status: 'QUEUED',
        })
        .select('id')
        .single()

      if (!inAppError && inAppRecord) {
        await inAppQueue.add(
          event,
          { notificationId: inAppRecord.id, payload },
          { jobId: inAppRecord.id }
        )
      }

      return { success: true }
    } catch (error: any) {
      console.error(`[ReminderWorker] Job ${job.id} failed:`, error.message)
      throw error // Retry via BullMQ
    }
  },
  { connection }
)

reminderWorker.on('failed', (job, err) => {
  console.error(`[ReminderWorker] Job ${job?.id} failed utterly:`, err)
})
