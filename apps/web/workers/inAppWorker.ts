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
          title = 'New Booking!'
          message = `${payload.email || payload.playerName || 'A user'} booked a slot at ${payload.venueName || 'your venue'} on ${payload.date || ''} for ${payload.timeSlot || ''}. Amount: ₹${payload.amount || '0'}.`
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

      // 4. Update lifecycle to PROCESSING
      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'PROCESSING',
      })

      // 5. Create the In-App notification record for the UI bell with extended fields
      const { data: newNotif, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: payload.title || title,
          message: payload.message || message,
          type: payload.priority === 'CRITICAL' || payload.priority === 'HIGH' ? 'WARNING' : 'INFO',
          category: payload.category || 'SYSTEM',
          priority: payload.priority || 'MEDIUM',
          icon: payload.icon || null,
          color: payload.color || null,
          action_button: payload.actionButton || false,
          action_text: payload.actionText || null,
          expires_at: payload.expiresAt || null,
          metadata: payload.metadata || {},
        })
        .select('id')
        .single()

      if (insertError || !newNotif) {
        throw insertError || new Error('Failed to create notification')
      }

      // 6. Log SENT lifecycle & analytics markers
      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'SENT',
      })

      await supabase.from('notification_analytics').insert({
        notification_id: newNotif.id,
        action: 'SENT',
      })

      // 7. Update lifecycle to DELIVERED
      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'DELIVERED',
      })

      await supabase.from('notification_analytics').insert({
        notification_id: newNotif.id,
        action: 'DELIVERED',
      })

      // 8. Mark Event as Delivered in events log
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

      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'PROCESSING',
        error_message: error.message,
      })

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
