import { describe, it, expect, vi, beforeAll } from 'vitest'
import { POST } from '../../../app/api/webhooks/razorpay/route'
import * as webhookLib from '../../../lib/payments/webhook'
import { createAdminClient } from '../../../lib/supabase/admin'

// Mock Supabase client
vi.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// Mock Webhook signature verification
vi.mock('../../../lib/payments/webhook', () => ({
  verifyRazorpayWebhook: vi.fn(),
}))

const mockSupabase = {
  rpc: vi.fn(),
}

describe('Razorpay Webhook Integration (Phase 2.2)', () => {
  beforeAll(() => {
    ;(createAdminClient as any).mockReturnValue(mockSupabase)
  })

  const createMockRequest = (
    payload: any,
    signature: string = 'valid_sig',
    eventId: string = 'evt_123'
  ) => {
    return {
      headers: {
        get: (key: string) => {
          if (key === 'x-razorpay-signature') return signature
          if (key === 'x-razorpay-event-id') return eventId
          return null
        },
      },
      text: async () => JSON.stringify(payload),
    } as unknown as Request
  }

  it('Rejects invalid signature with 401', async () => {
    ;(webhookLib.verifyRazorpayWebhook as any).mockReturnValue(false)
    const req = createMockRequest({ event: 'order.paid' }, 'invalid_sig')

    const response = await POST(req)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid signature')
  })

  it('Successfully processes valid signature and calls process_payment_webhook', async () => {
    ;(webhookLib.verifyRazorpayWebhook as any).mockReturnValue(true)
    mockSupabase.rpc.mockResolvedValue({ data: 'SUCCESS', error: null })

    const payload = {
      event: 'order.paid',
      payload: {
        payment: { entity: { id: 'pay_test', amount: 50000 } },
        order: { entity: { notes: { bookingId: 'booking_123' } } },
      },
    }
    const req = createMockRequest(payload)

    const response = await POST(req)
    expect(response.status).toBe(200)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('process_payment_webhook', {
      p_razorpay_event_id: 'evt_123',
      p_business_event: 'BOOKING_PAID',
      p_booking_id: 'booking_123',
      p_payment_id: 'pay_test',
      p_amount: 500, // 50000 paise to 500 rupees
      p_payload: payload,
    })
  })

  it('Returns success no-op on duplicate delivery', async () => {
    ;(webhookLib.verifyRazorpayWebhook as any).mockReturnValue(true)
    mockSupabase.rpc.mockResolvedValue({ data: 'ALREADY_PROCESSED', error: null })

    const req = createMockRequest({
      event: 'order.paid',
      payload: { payment: { entity: { id: 'pay_test' } } },
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('Already processed')
  })

  it('Returns 500 on database failure to trigger Razorpay retries', async () => {
    ;(webhookLib.verifyRazorpayWebhook as any).mockReturnValue(true)
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } })

    const req = createMockRequest({
      event: 'order.paid',
      payload: { payment: { entity: { id: 'pay_test' } } },
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})
