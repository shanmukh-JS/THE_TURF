import crypto from 'crypto'
import { createAdminClient } from '../supabase/admin'

const EXPIRY_MINS = 5
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SECS = 30

// SHA-256 Hashing of OTP
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Generate secure 6-digit OTP
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

// Rate Limiting Checks
export async function checkRateLimit(
  email: string,
  ip: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient()
  const now = new Date()

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Max 20 OTPs / day / IP
  const { count: ipCount, error: ipError } = await supabase
    .from('otp_verification')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gt('created_at', oneDayAgo.toISOString())

  if (ipError) return { allowed: false, reason: 'Database rate-limit check failed.' }
  if (ipCount && ipCount >= 20) {
    return {
      allowed: false,
      reason: 'Too many OTP requests from this IP today. Try again tomorrow.',
    }
  }

  // 2. Max 5 OTPs / hour / email
  const { count: hourEmailCount, error: hrError } = await supabase
    .from('otp_verification')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gt('created_at', oneHourAgo.toISOString())

  if (hrError) return { allowed: false, reason: 'Database rate-limit check failed.' }
  if (hourEmailCount && hourEmailCount >= 5) {
    return { allowed: false, reason: 'Too many OTP requests for this email. Try again in an hour.' }
  }

  // 3. Max 10 OTPs / day / email
  const { count: dayEmailCount, error: dyError } = await supabase
    .from('otp_verification')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gt('created_at', oneDayAgo.toISOString())

  if (dyError) return { allowed: false, reason: 'Database rate-limit check failed.' }
  if (dayEmailCount && dayEmailCount >= 10) {
    return {
      allowed: false,
      reason: 'Daily OTP request limit exceeded for this email. Try again tomorrow.',
    }
  }

  // 4. Cooldown Check: 30 seconds
  const { data: lastOtp, error: lastError } = await supabase
    .from('otp_verification')
    .select('created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastError) return { allowed: false, reason: 'Cooldown verification failed.' }
  if (lastOtp) {
    const elapsed = now.getTime() - new Date(lastOtp.created_at).getTime()
    if (elapsed < RESEND_COOLDOWN_SECS * 1000) {
      const waitTime = Math.ceil((RESEND_COOLDOWN_SECS * 1000 - elapsed) / 1000)
      return {
        allowed: false,
        reason: `Please wait ${waitTime} seconds before requesting a new OTP.`,
      }
    }
  }

  return { allowed: true }
}

// Stores the generated OTP hash in DB
export async function storeOtp(params: {
  email: string
  otp: string
  purpose: 'registration' | 'forgot_password' | 'email_verification' | 'email_change'
  ipAddress: string
  userAgent: string
  userId?: string
}): Promise<boolean> {
  const supabase = createAdminClient()
  const otp_hash = hashOtp(params.otp)
  const expires_at = new Date(Date.now() + EXPIRY_MINS * 60 * 1000).toISOString()

  // Invalidate any existing active OTPs for this email/purpose
  await supabase
    .from('otp_verification')
    .update({ status: 'expired' })
    .eq('email', params.email)
    .eq('purpose', params.purpose)
    .eq('status', 'pending')

  // Get resend_count for this email/purpose in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentResends } = await supabase
    .from('otp_verification')
    .select('*', { count: 'exact', head: true })
    .eq('email', params.email)
    .eq('purpose', params.purpose)
    .gt('created_at', oneHourAgo)

  const resend_count = recentResends || 0

  const { error } = await supabase.from('otp_verification').insert([
    {
      email: params.email,
      user_id: params.userId || null,
      otp_hash,
      purpose: params.purpose,
      expires_at,
      resend_count,
      status: 'pending',
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    },
  ])

  return !error
}

// Verifies the OTP code
export async function verifyOtp(params: {
  email: string
  otp: string
  purpose: 'registration' | 'forgot_password' | 'email_verification' | 'email_change'
}): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
  const supabase = createAdminClient()
  const hashed = hashOtp(params.otp)

  // Fetch the active OTP
  const { data: record, error } = await supabase
    .from('otp_verification')
    .select('*')
    .eq('email', params.email)
    .eq('purpose', params.purpose)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !record) {
    return {
      success: false,
      errorCode: 'OTP_NOT_FOUND',
      errorMessage: 'No pending verification request found.',
    }
  }

  // Check if expired
  if (new Date(record.expires_at).getTime() < Date.now()) {
    await supabase.from('otp_verification').update({ status: 'expired' }).eq('id', record.id)
    return {
      success: false,
      errorCode: 'OTP_EXPIRED',
      errorMessage: 'The verification code has expired.',
    }
  }

  // Check attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    await supabase.from('otp_verification').update({ status: 'blocked' }).eq('id', record.id)
    return {
      success: false,
      errorCode: 'OTP_BLOCKED',
      errorMessage: 'Too many failed attempts. This code is now blocked.',
    }
  }

  // Check OTP code match
  if (record.otp_hash !== hashed) {
    // Increment attempts count
    await supabase
      .from('otp_verification')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id)

    const remaining = MAX_ATTEMPTS - (record.attempts + 1)
    return {
      success: false,
      errorCode: 'INVALID_OTP',
      errorMessage: `Invalid verification code. ${remaining} attempts remaining.`,
    }
  }

  // OTP is valid! Update status to verified
  await supabase
    .from('otp_verification')
    .update({
      status: 'verified',
      used_at: new Date().toISOString(),
    })
    .eq('id', record.id)

  return { success: true }
}
