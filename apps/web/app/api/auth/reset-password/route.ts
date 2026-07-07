import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/email/crypto'
import { sendEmail } from '@/lib/email/mailer'
import { templates } from '@/lib/email/templates'
import { checkPasswordStrength, apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const { resetToken, password } = await req.json()

    if (!resetToken || !password) {
      return apiError('MISSING_FIELDS', 'Reset token and new password are required.')
    }

    // 1. Decrypt token
    let tokenData: { email: string; expiresAt: number }
    try {
      const decrypted = decrypt(resetToken)
      tokenData = JSON.parse(decrypted)
    } catch {
      return apiError('INVALID_TOKEN', 'The reset token is invalid or tampered.')
    }

    if (!tokenData || !tokenData.email || !tokenData.expiresAt) {
      return apiError('INVALID_TOKEN', 'The reset token is invalid.')
    }

    // 2. Check token expiry
    if (tokenData.expiresAt < Date.now()) {
      return apiError('TOKEN_EXPIRED', 'The reset token has expired. Please request a new OTP.')
    }

    const supabase = createAdminClient()

    // 3. Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', tokenData.email)
      .maybeSingle()

    if (userError || !user) {
      return apiError('USER_NOT_FOUND', 'No account found with this email.')
    }

    // Get name for email template
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

    // 4. Validate password strength
    const strengthResult = checkPasswordStrength(password, name, tokenData.email)
    if (!strengthResult.valid) {
      return apiError('WEAK_PASSWORD', strengthResult.reason || 'Password is too weak.')
    }

    // 5. Update user password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
    })

    if (updateError) {
      console.error('Password reset Admin API error:', updateError)
      return apiError('RESET_FAILED', updateError.message || 'Failed to update password.')
    }

    // 6. Invalidate all sessions globally
    try {
      await supabase.auth.admin.signOut(user.id, 'global')
    } catch (signOutErr) {
      console.error('Non-critical global signout error during password reset:', signOutErr)
    }

    // 7. Send notification email
    await sendEmail({
      to: tokenData.email,
      subject: 'Password Changed Successfully',
      html: templates.password_changed(name),
      templateName: 'password_changed',
    })

    return apiSuccess('Password updated successfully.')
  } catch (err: any) {
    console.error('Reset Password API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
