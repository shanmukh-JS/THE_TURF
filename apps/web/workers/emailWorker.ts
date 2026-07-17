import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { createAdminClient } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const emailWorker = new Worker(
  QUEUES.EMAIL,
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

      // 3. Simple string replacement for dynamic variables (e.g. {{ playerName }})
      // Sanitize values to prevent XSS in email HTML
      let subject = template.subject
      let html = template.html_body

      for (const [key, value] of Object.entries(payload)) {
        if (typeof value === 'string' || typeof value === 'number') {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
          const sanitized = String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
          subject = subject.replace(regex, sanitized)
          html = html.replace(regex, sanitized)
        }
      }
      // Strip remaining unreplaced template variables
      subject = subject.replace(/\{\{\s*\w+\s*\}\}/g, '')
      html = html.replace(/\{\{\s*\w+\s*\}\}/g, '')

      // 4. Send Email
      const emailTo = payload.email
      if (!emailTo) throw new Error('No recipient email provided in payload')

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"TRUF GAMING" <noreply@trufgaming.com>',
        to: emailTo,
        subject,
        html,
      })

      // 5. Mark as Delivered
      await supabase
        .from('notification_events')
        .update({
          status: 'DELIVERED',
          provider_message_id: info.messageId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      return { success: true, messageId: info.messageId }
    } catch (error: any) {
      console.error(`[EmailWorker] Job ${job.id} failed:`, error.message)

      // Mark as Failed
      await supabase
        .from('notification_events')
        .update({
          status: 'FAILED',
          error_text: error.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      throw error // Let BullMQ handle retries
    }
  },
  { connection }
)

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed utterly after retries:`, err)
})
