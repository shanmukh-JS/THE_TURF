import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, checkRateLimit, storeOtp } from '@/lib/email/otp'
import { sendEmail } from '@/lib/email/mailer'
import { templates } from '@/lib/email/templates'
import { apiSuccess, apiError } from '@/lib/email/validation'
import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = await rateLimitGuard(req, 'forgotPassword')
    if (limitResponse) return limitResponse

    const { email } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    if (!email) {
      return apiError('MISSING_FIELDS', 'Email address is required.')
    }

    const supabase = createAdminClient()

    // Verify account exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle()

    if (userError || !user) {
      return apiError('USER_NOT_FOUND', 'No account found with this email.')
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(email, ip)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', rateLimit.reason || 'Too many requests.')
    }

    // Get user's full name from profile
    let name = 'User'
    if (user.role === 'OWNER') {
      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profile) name = profile.full_name
    } else {
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profile) name = profile.full_name
    }

    const otp = generateOtp()

    const stored = await storeOtp({
      email,
      otp,
      purpose: 'forgot_password',
      ipAddress: ip,
      userAgent,
      userId: user.id,
    })

    if (!stored) {
      return apiError('OTP_STORAGE_FAILED', 'Failed to secure verification code.')
    }

    const mailSent = await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: templates.forgot_password_otp(name, otp),
      templateName: 'forgot_password_otp',
    })

    if (!mailSent.success) {
      return apiError('EMAIL_DELIVERY_FAILED', 'Failed to deliver verification code email.')
    }

    return apiSuccess('Verification code sent successfully.')
  } catch (err: any) {
    console.error('Forgot Password API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
