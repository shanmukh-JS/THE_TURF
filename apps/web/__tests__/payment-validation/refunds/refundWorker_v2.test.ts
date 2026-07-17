import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processRefundJob } from '../../../workers/refundWorker'
import { getPaymentProvider } from '../../../lib/payments/factory'
import { emitRefundProcessingEvent, emitRefundFailedEvent } from '../../../lib/events/handlers'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}))

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(function () {
    return {
      on: vi.fn(),
    }
  }),
  Queue: vi.fn(),
  QueueEvents: vi.fn(),
}))

vi.mock('../../../workers/queues', () => ({
  connection: {},
  QUEUES: { REFUND: 'refund.queue' },
}))

vi.mock('../../../workers/redisLock', () => ({
  RedisLock: class {
    async acquire() {
      return true
    }
    async release() {
      return true
    }
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('../../../lib/payments/factory', () => ({
  getPaymentProvider: vi.fn(),
}))

vi.mock('../../../lib/events/handlers', () => ({
  emitRefundProcessingEvent: vi.fn().mockResolvedValue({ success: true }),
  emitRefundFailedEvent: vi.fn().mockResolvedValue({ success: true }),
}))

const mockPaymentProvider = {
  refund: vi.fn(),
}

describe('RefundWorker V2 Job Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getPaymentProvider as any).mockReturnValue(mockPaymentProvider)
  })

  it('should process refund job, transition status, call Razorpay, and emit processing event', async () => {
    // 1. Mock DB returns for refund fetch
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'refund-123',
        booking_id: 'booking-456',
        payment_id: 'pay_xyz',
        amount: 350.0,
        status: 'QUEUED',
        cancelled_by: 'PLAYER',
        correlation_id: 'corr-888',
        bookings: { customer_id: 'user-777' },
      },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'refunds') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'refund_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    // 2. Mock Razorpay Refund Success
    mockPaymentProvider.refund.mockResolvedValue({ id: 'rp_ref_111', status: 'processed' })

    // 3. Trigger worker handler callback directly
    const mockJob: any = {
      id: 'job-111',
      attemptsMade: 0,
      data: {
        refundId: 'refund-123',
        bookingId: 'booking-456',
        correlationId: 'corr-888',
      },
    }

    const result = await processRefundJob(mockJob)

    // 4. Assertions
    expect(mockPaymentProvider.refund).toHaveBeenCalledWith('pay_xyz', 35000)
    expect(emitRefundProcessingEvent).toHaveBeenCalledWith({
      refundId: 'refund-123',
      bookingId: 'booking-456',
      userId: 'user-777',
      amount: 350.0,
      correlationId: 'corr-888',
    })
    expect(result.providerRefundId).toBe('rp_ref_111')
  })

  it('should handle Razorpay refund failure and emit refund.failed event', async () => {
    // 1. Mock DB returns for refund fetch
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'refund-123',
        booking_id: 'booking-456',
        payment_id: 'pay_xyz',
        amount: 350.0,
        status: 'QUEUED',
        cancelled_by: 'PLAYER',
        correlation_id: 'corr-888',
        bookings: { customer_id: 'user-777' },
      },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'refunds') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { customer_id: 'user-777' } }),
            }),
          }),
        }
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    // 2. Mock Razorpay Refund throwing error
    mockPaymentProvider.refund.mockRejectedValue(new Error('Razorpay service unavailable'))

    // 3. Trigger worker handler callback directly
    const mockJob: any = {
      id: 'job-111',
      attemptsMade: 4, // Max attempts reached
      data: {
        refundId: 'refund-123',
        bookingId: 'booking-456',
        correlationId: 'corr-888',
      },
    }

    await expect(processRefundJob(mockJob)).rejects.toThrow('Razorpay service unavailable')

    // 4. Assertions
    expect(emitRefundFailedEvent).toHaveBeenCalledWith({
      refundId: 'refund-123',
      bookingId: 'booking-456',
      userId: 'user-777',
      error: 'Razorpay service unavailable',
      correlationId: 'corr-888',
    })
  })
})
