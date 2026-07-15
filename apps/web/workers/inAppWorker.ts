import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { createAdminClient } from '@/lib/supabase/admin'

export const inAppWorker = new Worker(
  QUEUES.IN_APP,
  async (job: Job) => {
    const { notificationId, payload } = job.data
    const supabase = createAdminClient()

    try {
      // 1. Mark as processing
      await supabase
        .from('notification_events')
        .update({ status: 'PROCESSING' })
        .eq('id', notificationId)

      // 2. Fetch the template from DB
      const { data: template, error: templateError } = await supabase
        .from('unified_notification_templates')
        .select('subject, html_body')
        .eq('event', job.name)
        .single()

      if (templateError || !template) {
        throw new Error(`Template not found for event: ${job.name}`)
      }

      // 3. Simple string replacement for dynamic variables in title
      let title = template.subject
      for (const [key, value] of Object.entries(payload)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        title = title.replace(regex, String(value || ''))
      }

      // Generate a clean plain-text message for the UI (ignoring HTML template)
      let message = ''
      switch (job.name) {
        case 'BOOKING_CONFIRMED':
          message = `Your booking at ${payload.venueName || 'the venue'} on ${payload.date || ''} for ${payload.timeSlot || ''} is confirmed! Amount: ₹${payload.amount || '0'}.`
          break
        case 'NEW_BOOKING':
          message = `New booking at ${payload.venueName || 'your venue'} on ${payload.date || ''} for ${payload.timeSlot || ''}. Player: ${payload.playerName || 'Guest'}, Amount: ₹${payload.amount || '0'}.`
          break
        case 'BOOKING_CANCELLED':
          message = `Your booking at ${payload.venueName || 'the venue'} has been cancelled. Reason: ${payload.reason || 'N/A'}`
          break
        case 'PAYMENT_SUCCESSFUL':
          message = `Payment of ₹${payload.amount || '0'} was successful for your booking.`
          break
        case 'BOOKING_REMINDER_10_MIN':
          message = `Reminder: Your game at ${payload.venueName || 'the venue'} starts in 10 minutes (${payload.timeSlot || ''})!`
          break
        default:
          message = title // Fallback if no specific message
      }

      const userId = payload.userId || payload.ownerId
      if (!userId) throw new Error('No userId or ownerId provided for in-app notification')

      // 4. Create the In-App notification record for the UI bell
      let notifType = 'INFO'
      if (job.name.includes('BOOKING')) notifType = 'BOOKING'
      if (job.name.includes('CANCEL')) notifType = 'WARNING'

      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type: notifType,
      })

      if (insertError) throw insertError

      // 5. Mark Event as Delivered
      await supabase
        .from('notification_events')
        .update({
          status: 'DELIVERED',
          processed_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      return { success: true }
    } catch (error: any) {
      console.error(`[InAppWorker] Job ${job.id} failed:`, error.message)

      await supabase
        .from('notification_events')
        .update({
          status: 'FAILED',
          error_text: error.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      throw error
    }
  },
  { connection }
)

inAppWorker.on('failed', (job, err) => {
  console.error(`[InAppWorker] Job ${job?.id} failed utterly:`, err)
})
