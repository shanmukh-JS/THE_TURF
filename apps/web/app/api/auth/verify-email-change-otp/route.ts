import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { verifyOtp } from '@/lib/email/otp'
import { apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return apiError('MISSING_FIELDS', 'Email and OTP code are required.')
    }

    const serverSupabase = await createServerClient()
    const {
      data: { session },
    } = await serverSupabase.auth.getSession()

    if (!session?.user) {
      return apiError('UNAUTHORIZED', 'You must be logged in to verify this change.')
    }

    const userId = session.user.id
    const supabase = createAdminClient()

    // 1. Verify OTP in DB
    const verification = await verifyOtp({
      email,
      otp,
      purpose: 'email_change',
    })

    if (!verification.success) {
      return apiError(
        verification.errorCode || 'VERIFICATION_FAILED',
        verification.errorMessage || 'Invalid verification code.'
      )
    }

    // 2. Update Auth User email using admin credentials
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email: email,
      email_confirm: true,
    })

    if (authError) {
      console.error('Supabase admin email update error:', authError)
      return apiError('EMAIL_UPDATE_FAILED', authError.message || 'Failed to update email address.')
    }

    // 3. Update public.users table as well
    const { error: dbError } = await supabase
      .from('users')
      .update({ email: email })
      .eq('id', userId)

    if (dbError) {
      console.error('DB email update error:', dbError)
    }

    return apiSuccess('Email address updated successfully!')
  } catch (err: any) {
    console.error('Verify Email Change OTP API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
