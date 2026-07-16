import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { getPaymentProvider } from '../../../lib/payments/factory'

// Mock Supabase client via globalThis to prevent hoisting / TDZ issues
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => (globalThis as any).mockSupabase),
}))

// Mock factory
vi.mock('../../../lib/payments/factory', () => ({
  getPaymentProvider: vi.fn(),
}))

// Mock queues
vi.mock('../../../workers/queues', () => ({
  settlementQueue: {
    add: vi.fn(),
  },
}))

const mockPaymentProvider = {
  verifyWebhook: vi.fn(),
}

describe('Razorpay Webhook Integration (Phase 2.2)', () => {
  let POST: any
  let mockSupabase: any
  let settlementQueueMock: any

  beforeAll(async () => {
    vi.resetModules()

    mockSupabase = {
      from: vi.fn(),
    }
    ;(globalThis as any).mockSupabase = mockSupabase
    ;(getPaymentProvider as any).mockReturnValue(mockPaymentProvider)

    // Load queue mock dynamically from the clean sandbox
    const queueModule = await import('../../../workers/queues')
    settlementQueueMock = queueModule.settlementQueue

    // Import dynamically to force route.ts execution in the clean sandbox
    const route = await import('../../../app/api/webhooks/razorpay/route')
    POST = route.POST
  })

  beforeEach(() => {
    vi.clearAllMocks()
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
    mockPaymentProvider.verifyWebhook.mockReturnValue(false)
    const req = createMockRequest({ event: 'order.paid' }, 'invalid_sig')

    const response = await POST(req)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid signature')
  })

  it('Successfully processes valid signature and enqueues job', async () => {
    mockPaymentProvider.verifyWebhook.mockReturnValue(true)

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'mock-event-db-id' },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockSupabase.from.mockReturnValue({ insert: mockInsert })

    const payload = {
      event: 'order.paid',
      payload: {
        payment: {
          entity: { id: 'pay_test', amount: 50000, currency: 'INR', order_id: 'order_123' },
        },
      },
    }
    const req = createMockRequest(payload)

    const response = await POST(req)
    expect(response.status).toBe(200)

    // Verify it saved the event to Supabase
    expect(mockSupabase.from).toHaveBeenCalledWith('webhook_logs')
    expect(mockInsert).toHaveBeenCalledWith({
      provider: 'razorpay',
      event_id: 'evt_123',
      event_type: 'order.paid',
      payload,
    })

    // Verify it enqueued background processing
    expect(settlementQueueMock.add).toHaveBeenCalledWith('process-payment-settlement', {
      webhookEventId: 'mock-event-db-id',
      paymentId: 'pay_test',
      orderId: 'order_123',
      amount: 50000,
      currency: 'INR',
    })
  })

  it('Returns success no-op on duplicate delivery', async () => {
    mockPaymentProvider.verifyWebhook.mockReturnValue(true)

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockSupabase.from.mockReturnValue({ insert: mockInsert })

    const req = createMockRequest({
      event: 'order.paid',
      payload: { payment: { entity: { id: 'pay_test' } } },
    })

    const response = await POST(req)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('Duplicate event ignored')
  })

  it('Returns 500 on database failure to trigger Razorpay retries', async () => {
    mockPaymentProvider.verifyWebhook.mockReturnValue(true)

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'OTHER_ERR', message: 'DB Error' },
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockSupabase.from.mockReturnValue({ insert: mockInsert })

    const req = createMockRequest({
      event: 'order.paid',
      payload: { payment: { entity: { id: 'pay_test' } } },
    })

    const response = await POST(req)
    expect(response.status).toBe(500)
  })
})
