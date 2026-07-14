import { createAdminClient } from '@/lib/supabase/admin'
import { globalEventBus } from '@/lib/events/EventBus'

export class NotificationScheduler {
  /**
   * Schedules a 10-minute pre-match reminder and a 5-minute post-match rating request.
   * Both are persisted as PENDING outbox records, avoiding process state failures.
   */
  async scheduleBookingNotifications(params: {
    bookingId: string
    slotId: string
    recipientPhone: string
    recipientEmail?: string
    customerName: string
    venueName: string
  }): Promise<void> {
    const supabase = createAdminClient()

    // 1. Fetch Slot Times
    const { data: slot } = await supabase
      .from('slots')
      .select('date, start_time, end_time')
      .eq('id', params.slotId)
      .single()

    if (!slot) {
      console.error(`[Scheduler] Slot ${params.slotId} not found. Cannot schedule reminders.`)
      return
    }

    const matchStartTime = new Date(slot.start_time)
    const matchEndTime = new Date(slot.end_time)

    // 2. Compute Target Times
    const reminderTime = new Date(matchStartTime.getTime() - 10 * 60 * 1000) // -10 minutes
    const ratingTime = new Date(matchEndTime.getTime() + 5 * 60 * 1000) // +5 minutes

    // 3. Write PENDING Reminder to Outbox
    const reminderIdempotency = `${params.bookingId}_match_reminder_v1`
    await supabase.from('notification_outbox').insert({
      event_type: 'match.reminder.v1',
      payload: {
        recipient: params.recipientPhone,
        templateName: 'match_reminder',
        variables: {
          Player: params.customerName,
          Venue: params.venueName,
          Time: matchStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          Address: slot.date, // Address is slot date for simple verification
          Email: params.recipientEmail || '',
        },
        bookingId: params.bookingId,
      },
      idempotency_key: reminderIdempotency,
      priority: 'HIGH',
      status: 'PENDING',
      scheduled_at: reminderTime.toISOString(),
    })

    // 4. Write PENDING Rating Request to Outbox
    const ratingIdempotency = `${params.bookingId}_rating_request_v1`
    await supabase.from('notification_outbox').insert({
      event_type: 'rating.request.v1',
      payload: {
        recipient: params.recipientPhone,
        templateName: 'rating_request',
        variables: {
          Venue: params.venueName,
          BookingId: params.bookingId,
        },
        bookingId: params.bookingId,
      },
      idempotency_key: ratingIdempotency,
      priority: 'MEDIUM',
      status: 'PENDING',
      scheduled_at: ratingTime.toISOString(),
    })

    console.log(
      `[Scheduler] Successfully scheduled reminder for ${reminderTime.toISOString()} and rating for ${ratingTime.toISOString()}`
    )
  }
}

export const notificationScheduler = new NotificationScheduler()
export default notificationScheduler
