import nodemailer from 'nodemailer'
import { decrypt } from './crypto'
import { createAdminClient } from '../supabase/admin'

export interface EmailSettings {
  id: string
  sender_name: string
  sender_email: string
  reply_to_email?: string
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string // encrypted in DB
  encryption_type?: 'TLS' | 'SSL' | 'None'
  provider: string
  is_enabled: boolean
}

// Fetches active email settings from the DB
export async function getActiveEmailSettings(): Promise<EmailSettings | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return data as EmailSettings
  } catch (err) {
    console.error('Error fetching active email settings:', err)
    return null
  }
}

// Sends an email using SMTP
async function sendSmtpEmail(
  settings: EmailSettings,
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string }> {
  const decryptedPassword = settings.smtp_password ? decrypt(settings.smtp_password) : ''
  const isSecure = settings.encryption_type === 'SSL'

  const timeoutMs = process.env.SMTP_TIMEOUT ? Number(process.env.SMTP_TIMEOUT) : 10000

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port || 587,
    secure: isSecure,
    auth: {
      user: settings.smtp_username || '',
      pass: decryptedPassword,
    },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
  })

  const info = await transporter.sendMail({
    from: `"${settings.sender_name}" <${settings.sender_email}>`,
    to,
    subject,
    html,
    replyTo: settings.reply_to_email || undefined,
  })

  return { messageId: info.messageId }
}

async function sendMockProviderEmail(
  settings: EmailSettings,
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string }> {
  console.log(`Sending email using simulated provider [${settings.provider}] to ${to}`)
  return { messageId: `mock_${settings.provider}_${Date.now()}` }
}

export async function sendEmailViaProvider(
  settings: EmailSettings,
  to: string,
  subject: string,
  html: string
): Promise<{ messageId: string }> {
  const provider = settings.provider.toLowerCase()
  if (provider === 'smtp') {
    return sendSmtpEmail(settings, to, subject, html)
  } else {
    return sendMockProviderEmail(settings, to, subject, html)
  }
}
