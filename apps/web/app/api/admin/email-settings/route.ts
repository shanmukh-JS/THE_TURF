import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/email/crypto'
import { apiSuccess, apiError } from '@/lib/email/validation'

// Guard to verify the authenticated user is an ADMIN
async function verifyAdmin() {
  const serverSupabase = await createServerClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  if (!user) return null
  const { data: dbUser } = await serverSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  return dbUser?.role === 'ADMIN' ? user : null
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
      return apiError('UNAUTHORIZED', 'Access denied.', 403)
    }

    const supabase = createAdminClient()
    const { data: settings, error } = await supabase
      .from('email_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching admin email settings:', error)
      return apiError('DB_ERROR', 'Failed to retrieve email settings.')
    }

    const responseData = settings
      ? {
          ...settings,
          smtp_password: settings.smtp_password ? '********' : '',
        }
      : {
          sender_name: 'TRUF GAMING',
          sender_email: '3shanmukhkadali@gmail.com',
          is_enabled: true,
          provider: 'smtp',
        }

    return apiSuccess('Email settings retrieved.', responseData)
  } catch (err: any) {
    console.error('GET email-settings error:', err)
    return apiError('SERVER_ERROR', 'An unexpected error occurred.')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
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
      is_enabled,
    } = body

    if (!sender_name || !sender_email) {
      return apiError('MISSING_FIELDS', 'Sender Name and Sender Email are required.')
    }

    const supabase = createAdminClient()

    const { data: existingSettings } = await supabase
      .from('email_settings')
      .select('id, smtp_password')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let encryptedPassword = existingSettings?.smtp_password || ''
    if (smtp_password && smtp_password !== '********') {
      encryptedPassword = encrypt(smtp_password)
    }

    const updatePayload = {
      sender_name,
      sender_email,
      reply_to_email,
      smtp_host,
      smtp_port: smtp_port ? Number(smtp_port) : null,
      smtp_username,
      smtp_password: encryptedPassword,
      encryption_type,
      provider: provider || 'smtp',
      is_enabled: is_enabled !== undefined ? is_enabled : true,
      updated_at: new Date().toISOString(),
      updated_by: adminUser.id,
    }

    let saveError
    if (existingSettings?.id) {
      const { error } = await supabase
        .from('email_settings')
        .update(updatePayload)
        .eq('id', existingSettings.id)
      saveError = error
    } else {
      const { error } = await supabase.from('email_settings').insert([updatePayload])
      saveError = error
    }

    if (saveError) {
      console.error('Error saving email settings:', saveError)
      return apiError('SAVE_FAILED', 'Failed to save email settings configuration.')
    }

    return apiSuccess('Email settings updated successfully.')
  } catch (err: any) {
    console.error('PUT email-settings error:', err)
    return apiError('SERVER_ERROR', 'An unexpected error occurred.')
  }
}
