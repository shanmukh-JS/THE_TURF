import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Escape HTML entities to prevent XSS in template variable interpolation.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const inAppWorker = new Worker(
  QUEUES.IN_APP,
  async (job: Job) => {
    const { notificationId, payload } = job.data
    const supabase = createAdminClient()

    try {
      // 1. Log CREATED lifecycle state
      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'CREATED',
      })

      // 2. Mark as processing
      await supabase
        .from('notification_events')
        .update({ status: 'PROCESSING' })
        .eq('id', notificationId)

      await supabase.from('notification_lifecycle_log').insert({
        notification_id: notificationId,
        state: 'PROCESSING',
      })

      // 3. Attempt to fetch a template from DB (optional — graceful fallback)
      let title = payload.title || job.name.replace(/_/g, ' ')
      let message = payload.message || ''

      const { data: template } = await supabase
        .from('unified_notification_templates')
        .select('subject, html_body')
        .eq('event', job.name)
        .maybeSingle()

      if (template) {
        // Template found — apply variable substitution with XSS escaping
        title = template.subject
        for (const [key, value] of Object.entries(payload)) {
          if (typeof value === 'string' || typeof value === 'number') {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
            title = title.replace(regex, escapeHtml(String(value)))
          }
        }
        // Strip remaining unreplaced template variables
        title = title.replace(/\{\{\s*\w+\s*\}\}/g, '')
      }

      // 4. Determine userId
      const userId = payload.userId || payload.ownerId
      if (!userId) throw new Error('No userId or ownerId provided for in-app notification')

      // 5. Create the In-App notification record for the UI bell
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
