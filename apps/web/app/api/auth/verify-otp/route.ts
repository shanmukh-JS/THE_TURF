import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifyOtp } from '@/lib/email/otp'
import { decrypt } from '@/lib/email/crypto'
import { sendEmail } from '@/lib/email/mailer'
import { templates } from '@/lib/email/templates'
import { apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json()

    if (!email || !otp || !password) {
      return apiError('MISSING_FIELDS', 'Email, password, and OTP code are required.')
    }

    const supabase = createAdminClient()

    // 1. Fetch temporary registration data
    const { data: temp, error: tempError } = await supabase
      .from('temp_registrations')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (tempError || !temp) {
      return apiError('REGISTRATION_NOT_FOUND', 'No pending registration found for this email.')
    }

    // 2. Verify OTP
    const verification = await verifyOtp({
      email,
      otp,
      purpose: 'registration',
    })

    if (!verification.success) {
      return apiError(
        verification.errorCode || 'VERIFICATION_FAILED',
        verification.errorMessage || 'Invalid OTP.'
      )
    }

    // 3. Create Supabase Auth User
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: temp.name,
        role: temp.role,
      },
    })

    if (authError || !authUser.user) {
      console.error('Supabase admin user creation error:', authError)
      return apiError(
        'USER_CREATION_FAILED',
        authError?.message || 'Failed to create user account.'
      )
    }

    // 4. Update phone number on public.users
    await supabase.from('users').update({ phone: temp.phone }).eq('id', authUser.user.id)

    // 5. Clean up temporary registration data
    await supabase.from('temp_registrations').delete().eq('email', email)

    // 6. Sign in the user using standard next server client to set cookie session
    const serverSupabase = await createServerClient()
    const { data: sessionData, error: signInError } = await serverSupabase.auth.signInWithPassword({
      email,
      password: password,
    })

    if (signInError) {
      console.error('Session signin error after verification:', signInError)
      return apiError(
        'SIGNIN_FAILED',
        'Account verified successfully, but auto-login failed. Please sign in manually.'
      )
    }

    // 7. Dispatch Welcome Email
    await sendEmail({
      to: email,
      subject: 'Welcome to TURF GAMING!',
      html: templates.welcome(temp.name),
      templateName: 'welcome',
    })

    return apiSuccess('Verification successful. Account created and signed in.', {
      session: sessionData.session,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: temp.role,
        fullName: temp.name,
      },
    })
  } catch (err: any) {
    console.error('Verify OTP API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
