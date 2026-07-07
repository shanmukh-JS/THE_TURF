import { createAdminClient } from '../supabase/admin'
import { getActiveEmailSettings, sendEmailViaProvider, EmailSettings } from './provider'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  templateName: string
}

// Logs the email to public.email_logs
async function logEmail(log: {
  recipient: string
  subject: string
  template: string
  status: 'Sent' | 'Failed'
  provider: string
  message_id?: string
  delivery_time_ms?: number
  error_message?: string
  retry_count?: number
}): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('email_logs').insert([log]).select('id').single()

  if (error) {
    console.error('Error logging email delivery:', error)
    return ''
  }
  return data?.id || ''
}

// Updates an existing email log
async function updateEmailLog(
  logId: string,
  updates: Partial<{
    status: 'Sent' | 'Failed'
    message_id: string
    delivery_time_ms: number
    error_message: string
    retry_count: number
  }>
) {
  if (!logId) return
  const supabase = createAdminClient()
  await supabase.from('email_logs').update(updates).eq('id', logId)
}

// Triggers background retry logic with incremental delay timeouts
function queueRetry(
  params: SendEmailParams,
  settings: EmailSettings,
  logId: string,
  currentRetry: number
) {
  const retryDelays = [30000, 120000, 600000] // 30s, 2m, 10m
  if (currentRetry >= retryDelays.length) {
    console.error(`Email to ${params.to} failed after maximum retry attempts.`)
    updateEmailLog(logId, { status: 'Failed', retry_count: currentRetry })
    return
  }

  const delay = retryDelays[currentRetry]
  console.log(`Scheduling retry #${currentRetry + 1} in ${delay}ms for email to ${params.to}`)

  setTimeout(async () => {
    const startTime = Date.now()
    try {
      const result = await sendEmailViaProvider(settings, params.to, params.subject, params.html)
      const deliveryTime = Date.now() - startTime
      await updateEmailLog(logId, {
        status: 'Sent',
        message_id: result.messageId,
        delivery_time_ms: deliveryTime,
        retry_count: currentRetry + 1,
      })
    } catch (err: any) {
      console.error(`Retry #${currentRetry + 1} failed:`, err.message)
      await updateEmailLog(logId, {
        error_message: err.message,
        retry_count: currentRetry + 1,
      })
      queueRetry(params, settings, logId, currentRetry + 1)
    }
  }, delay)
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; logId?: string; messageId?: string }> {
  const startTime = Date.now()
  const settings = await getActiveEmailSettings()

  if (!settings) {
    console.error('No active email settings found in database. Email aborted.')
    const logId = await logEmail({
      recipient: params.to,
      subject: params.subject,
      template: params.templateName,
      status: 'Failed',
      provider: 'None',
      error_message: 'No active email settings configuration.',
    })
    return { success: false, logId }
  }

  try {
    const result = await sendEmailViaProvider(settings, params.to, params.subject, params.html)
    const deliveryTime = Date.now() - startTime
    const logId = await logEmail({
      recipient: params.to,
      subject: params.subject,
      template: params.templateName,
      status: 'Sent',
      provider: settings.provider,
      message_id: result.messageId,
      delivery_time_ms: deliveryTime,
    })
    return { success: true, logId, messageId: result.messageId }
  } catch (err: any) {
    console.error(`Initial email sending failed to ${params.to}:`, err.message)
    const logId = await logEmail({
      recipient: params.to,
      subject: params.subject,
      template: params.templateName,
      status: 'Failed',
      provider: settings.provider,
      error_message: err.message,
    })

    queueRetry(params, settings, logId, 0)
    return { success: false, logId }
  }
}

// Allows retrying failed emails manually via Admin controller
export async function retryFailedEmail(logId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data: log, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('id', logId)
    .single()

  if (error || !log) return false

  const settings = await getActiveEmailSettings()
  if (!settings) return false

  const startTime = Date.now()
  try {
    const result = await sendEmailViaProvider(settings, log.recipient, log.subject, log.html || '')
    const deliveryTime = Date.now() - startTime
    await updateEmailLog(logId, {
      status: 'Sent',
      message_id: result.messageId,
      delivery_time_ms: deliveryTime,
      retry_count: log.retry_count + 1,
      error_message: '',
    })
    return true
  } catch (err: any) {
    await updateEmailLog(logId, {
      retry_count: log.retry_count + 1,
      error_message: err.message,
    })
    return false
  }
}
