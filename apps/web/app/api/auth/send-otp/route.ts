import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateOtp, checkRateLimit, storeOtp } from '@/lib/email/otp'
import { sendEmail } from '@/lib/email/mailer'
import { templates } from '@/lib/email/templates'
import { apiSuccess, apiError } from '@/lib/email/validation'
import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitGuard(req, 'otp')
    if (limitResponse) return limitResponse

    let { email, purpose } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    if (!email || !purpose) {
      return apiError('MISSING_FIELDS', 'Email and purpose are required.')
    }

    if (
      purpose !== 'registration' &&
      purpose !== 'forgot_password' &&
      purpose !== 'email_change' &&
      purpose !== 'login_verification'
    ) {
      return apiError('INVALID_PURPOSE', 'Invalid OTP purpose specified.')
    }

    const supabase = createAdminClient()

    let name = 'User'
    let userId: string | undefined

    if (purpose === 'email_change' || purpose === 'login_verification') {
      const serverSupabase = await createServerClient()
      const {
        data: { session },
      } = await serverSupabase.auth.getSession()
      if (!session?.user) {
        return apiError('UNAUTHORIZED', 'You must be logged in to request this verification code.')
      }
      userId = session.user.id
      if (purpose === 'login_verification' && session.user.email) {
        email = session.user.email
      }

      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (user) {
        if (user.role === 'OWNER') {
          const { data: profile } = await supabase
            .from('owner_profiles')
            .select('full_name')
            .eq('user_id', userId)
            .maybeSingle()
          if (profile) name = profile.full_name
        } else {
          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('full_name')
            .eq('user_id', userId)
            .maybeSingle()
          if (profile) name = profile.full_name
        }
      }
    } else if (purpose === 'registration') {
      const { data: temp } = await supabase
        .from('temp_registrations')
        .select('name')
        .eq('email', email)
        .maybeSingle()

      if (!temp) {
        return apiError(
          'REGISTRATION_NOT_FOUND',
          'No active registration process found for this email.'
        )
      }
      name = temp.name
    } else {
      const { data: user } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .maybeSingle()

      if (!user) {
        return apiError('USER_NOT_FOUND', 'No account found with this email.')
      }

      userId = user.id

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
    }

    const rateLimit = await checkRateLimit(email, ip)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', rateLimit.reason || 'Too many requests.')
    }

    const otp = generateOtp()

    const stored = await storeOtp({
      email,
      otp,
      purpose,
      ipAddress: ip,
      userAgent,
      userId,
    })

    if (!stored) {
      return apiError('OTP_STORAGE_FAILED', 'Failed to secure verification code.')
    }

    const htmlContent =
      purpose === 'registration'
        ? templates.registration_otp(name, otp)
        : purpose === 'email_change'
          ? templates.email_change_otp(name, otp)
          : purpose === 'login_verification'
            ? templates.login_verification_otp(name, otp)
            : templates.forgot_password_otp(name, otp)

    const mailSent = await sendEmail({
      to: email,
      subject:
        purpose === 'registration'
          ? 'Verify Your TRUF GAMING Account'
          : purpose === 'email_change'
            ? 'Verify Your New Email Address'
            : purpose === 'login_verification'
              ? 'Your Two-Factor Authentication Code'
              : 'Reset Your Password',
      html: htmlContent,
      templateName:
        purpose === 'registration'
          ? 'registration_otp'
          : purpose === 'email_change'
            ? 'email_change_otp'
            : purpose === 'login_verification'
              ? 'login_verification_otp'
              : 'forgot_password_otp',
    })

    if (!mailSent.success) {
      return apiError('EMAIL_DELIVERY_FAILED', 'Failed to deliver verification code email.')
    }

    return apiSuccess('Verification code sent successfully.')
  } catch (err: any) {
    console.error('Send OTP API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
