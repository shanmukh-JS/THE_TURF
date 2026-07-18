import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt, encrypt } from '@/lib/email/crypto'
import { sendEmailViaProvider, EmailSettings } from '@/lib/email/provider'
import { apiSuccess, apiError } from '@/lib/email/validation'

import { requireRole } from '@/lib/auth/requireRole'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'admin_api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { user: adminUser, error: roleError } = await requireRole(['ADMIN'])
    if (roleError || !adminUser) {
      return apiError('UNAUTHORIZED', 'Access denied.', 403)
    }

    const body = await req.json()
    const {
      sender_name,
      sender_email,
      reply_to_email,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      encryption_type,
      provider,
    } = body

    const supabase = createAdminClient()

    const { data: existingSettings } = await supabase
      .from('email_settings')
      .select('id, smtp_password')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let passwordToTest = smtp_password
    if (!smtp_password || smtp_password === '********') {
      passwordToTest = existingSettings?.smtp_password
        ? decrypt(existingSettings.smtp_password)
        : ''
    }

    const encryptedPass = passwordToTest ? encrypt(passwordToTest) : ''

    const testSettings: EmailSettings = {
      id: existingSettings?.id || 'temp',
      sender_name: sender_name || 'TRUF GAMING Test',
      sender_email: sender_email,
      reply_to_email,
      smtp_host,
      smtp_port: smtp_port ? Number(smtp_port) : undefined,
      smtp_username,
      smtp_password: passwordToTest ? encrypt(passwordToTest) : undefined,
      encryption_type,
      provider: provider || 'smtp',
      is_enabled: true,
    }

    const testEmailHtml = `
      <div style="background-color: #060d06; color: #e2e8f0; font-family: sans-serif; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0a0f0a; border: 1px solid #142814; border-radius: 16px; padding: 32px; text-align: center;">
          <h2 style="color: #22c55e;">⚡ SMTP Connection Test</h2>
          <p>Congratulations! Your SMTP connection to TRUF GAMING has been verified successfully.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Tested on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `

    let last_test_status = 'Connected'
    let is_verified = true

    try {
      await sendEmailViaProvider(testSettings, sender_email, 'TURF GAMING SMTP Test', testEmailHtml)
    } catch (err: any) {
      console.error('SMTP test connection failed:', err)
      last_test_status = err.message || 'Connection Failed'
      is_verified = false
    }

    if (existingSettings?.id) {
      await supabase
        .from('email_settings')
        .update({
          is_verified,
          last_tested_at: new Date().toISOString(),
          last_test_status,
        })
        .eq('id', existingSettings.id)
    } else {
      await supabase.from('email_settings').insert([
        {
          sender_name: sender_name || 'TRUF GAMING',
          sender_email,
          reply_to_email,
          smtp_host,
          smtp_port: smtp_port ? Number(smtp_port) : null,
          smtp_username,
          smtp_password: encryptedPass,
          encryption_type,
          provider: provider || 'smtp',
          is_verified,
          last_tested_at: new Date().toISOString(),
          last_test_status,
        },
      ])
    }

    if (!is_verified) {
      return apiError('CONNECTION_FAILED', `SMTP Connection check failed: ${last_test_status}`)
    }

    return apiSuccess('Test connection succeeded. Connection verified.', {
      status: 'Connected',
    })
  } catch (err: any) {
    console.error('SMTP connection check API error:', err)
    return apiError('SERVER_ERROR', 'An unexpected error occurred.')
  }
}
