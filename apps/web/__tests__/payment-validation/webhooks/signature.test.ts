import { describe, it, expect } from 'vitest'
import { verifyRazorpayWebhook } from '@/lib/payments/webhook'

const HAS_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET &&
  process.env.RAZORPAY_WEBHOOK_SECRET !== 'MyTurfGamingSecret123!'

describe('Webhooks: Signature Validation', () => {
  it('should reject invalid signatures', () => {
    const payload = JSON.stringify({ event: 'order.paid' })
    const invalidSignature = 'invalid_hash_string'

    const isValid = verifyRazorpayWebhook(payload, invalidSignature)
    expect(isValid).toBe(false)
  })

  // Full API test would hit POST /api/webhooks/razorpay and expect 401
  it.skipIf(!HAS_WEBHOOK_SECRET)(
    'should return 401 on the API route for bad signatures',
    async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${API_BASE}/webhooks/razorpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'bad_sig',
          'x-razorpay-event-id': 'evt_123',
        },
        body: JSON.stringify({ event: 'order.paid' }),
      })

      expect(res.status).toBe(401)
    }
  )
})
