import { NextRequest } from 'next/server'
import { verifyOtp } from '@/lib/email/otp'
import { encrypt } from '@/lib/email/crypto'
import { apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return apiError('MISSING_FIELDS', 'Email and OTP code are required.')
    }

    const verification = await verifyOtp({
      email,
      otp,
      purpose: 'forgot_password',
    })

    if (!verification.success) {
      return apiError(
        verification.errorCode || 'VERIFICATION_FAILED',
        verification.errorMessage || 'Invalid OTP.'
      )
    }

    // Generate secure stateless reset token
    const tokenPayload = {
      email,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }
    const resetToken = encrypt(JSON.stringify(tokenPayload))

    return apiSuccess('OTP verified successfully.', { resetToken })
  } catch (err: any) {
    console.error('Verify Reset OTP Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
