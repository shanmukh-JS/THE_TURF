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

      // 3. Simple string replacement for dynamic variables
      let title = template.subject
      let message = template.html_body // Or we could have a specific plaintext field

      for (const [key, value] of Object.entries(payload)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        const strValue = String(value || '')
        title = title.replace(regex, strValue)
        message = message.replace(regex, strValue)
      }

      // Strip HTML tags for in-app simple messages
      message = message.replace(/<[^>]*>?/gm, '')

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
