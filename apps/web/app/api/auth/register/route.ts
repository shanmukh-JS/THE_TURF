import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, checkRateLimit, storeOtp } from '@/lib/email/otp'
import { sendEmail } from '@/lib/email/mailer'
import { templates } from '@/lib/email/templates'
import { checkPasswordStrength, apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Validate inputs
    if (!name || !email || !phone || !password || !role) {
      return apiError('MISSING_FIELDS', 'All fields are required.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('INVALID_EMAIL', 'Please enter a valid email address.')
    }

    // Validate password strength
    const strengthResult = checkPasswordStrength(password, name, email)
    if (!strengthResult.valid) {
      return apiError('WEAK_PASSWORD', strengthResult.reason || 'Password is too weak.')
    }

    const supabase = createAdminClient()

    // Check if email already exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return apiError('EMAIL_TAKEN', 'An account with this email address already exists.')
    }

    // Check rate limiting rules
    const rateLimit = await checkRateLimit(email, ip)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', rateLimit.reason || 'Too many requests.')
    }

    // Hash the password for temporary storage
    const passwordHash = await bcrypt.hash(password, 10)

    // Upsert temporary registration details
    const { error: tempError } = await supabase.from('temp_registrations').upsert(
      {
        email,
        name,
        phone,
        password_hash: passwordHash,
        role,
      },
      { onConflict: 'email' }
    )

    if (tempError) {
      console.error('Error saving temp registration:', tempError)
      return apiError('REGISTRATION_FAILED', 'Failed to initiate registration process.')
    }

    // Generate secure OTP
    const otp = generateOtp()

    // Store OTP securely
    const stored = await storeOtp({
      email,
      otp,
      purpose: 'registration',
      ipAddress: ip,
      userAgent,
    })

    if (!stored) {
      return apiError('OTP_STORAGE_FAILED', 'Failed to secure verification code.')
    }

    // Dispatch email
    const mailSent = await sendEmail({
      to: email,
      subject: 'Verify Your TRUF GAMING Account',
      html: templates.registration_otp(name, otp),
      templateName: 'registration_otp',
    })

    if (!mailSent.success) {
      return apiError('EMAIL_DELIVERY_FAILED', 'Failed to deliver verification code email.')
    }

    return apiSuccess('Verification code sent successfully.')
  } catch (err: any) {
    console.error('Registration API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
