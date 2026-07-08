// ============================================================================
// TRUF GAMING — Webhook Signature Verification
// Secure verification for Razorpay Webhooks.
// Prevents spoofing attacks on the payment pipeline.
// ============================================================================

import crypto from 'crypto'
import { getEnv } from '@/config/env'

/**
 * Verifies that a webhook payload was legitimately sent by Razorpay.
 * @param payload Raw string body of the request
 * @param signature Value of the x-razorpay-signature header
 */
export function verifyRazorpayWebhook(payload: string, signature: string): boolean {
  try {
    const env = getEnv()
    const secret = env.RAZORPAY_WEBHOOK_SECRET

    if (!secret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not configured.')
      return false
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
  } catch (err) {
    console.error('Webhook signature verification error:', err)
    return false
  }
}
