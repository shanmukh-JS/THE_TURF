import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getPaymentProvider } from '../../../lib/payments/factory'
import { startWorkers } from '../../../lib/workers/whatsapp.worker'
import { postJournal } from '../../../lib/accounting/postJournal'
import { createAdminClient } from '../../../lib/supabase/admin'

let capturedCallback: any = null

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(function (queueName, callback) {
    if (queueName === 'tg_notifications_high') {
      capturedCallback = callback
    }
    return {
      on: vi.fn(),
    }
  }),
  Job: vi.fn(),
}))

vi.mock('../../../lib/queues/BaseQueue', () => ({
  getRedisConfig: vi.fn().mockReturnValue('redis://mock'),
}))

vi.mock('../../../lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}))

vi.mock('../../../lib/payments/factory', () => ({
  getPaymentProvider: vi.fn(),
}))

vi.mock('../../../lib/accounting/postJournal', () => ({
  postJournal: vi.fn(),
}))

const mockPaymentProvider = {
  refund: vi.fn(),
}

const mockSupabase = {
  from: vi.fn(),
}

describe('Refund Worker Job Processing (Phase 3.1)', () => {
  beforeAll(() => {
    ;(getPaymentProvider as any).mockReturnValue(mockPaymentProvider)
    startWorkers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process payment.refund job correctly and trigger Razorpay refund', async () => {
    expect(capturedCallback).not.toBeNull()

    // 1. Mock DB updates
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'mock-tx-uuid' },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return { update: mockUpdate }
      }
      return { insert: mockInsert }
    })

    // 2. Mock payment provider refund return value
    mockPaymentProvider.refund.mockResolvedValue({ id: 'ref_mock123' })

    // 3. Mock accounting ledger return value
    ;(postJournal as any).mockResolvedValue({ success: true, journalId: 'jrn_mock123' })

    // 4. Invoke the captured callback
    const dummyJob = {
      id: 'job-123',
      name: 'payment.refund',
      data: {
        bookingId: 'booking-abc',
        paymentId: 'pay_xyz',
        amount: 500.0,
        customerId: 'cust-789',
        reason: 'Player cancelled booking',
      },
    }

    await capturedCallback(dummyJob)

    // 5. Assertions
    // - Razorpay refund should be called with correct paise amount
    expect(mockPaymentProvider.refund).toHaveBeenCalledWith('pay_xyz', 50000)

    // - Supabase update should set payment_status to REFUND_COMPLETED
    expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
    expect(mockUpdate).toHaveBeenCalledWith({ payment_status: 'REFUND_COMPLETED' })

    // - Financial transaction should be inserted
    expect(mockSupabase.from).toHaveBeenCalledWith('financial_transactions')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_type: 'REFUND',
        status: 'COMPLETED',
        amount: 500.0,
      })
    )

    // - Ledger postJournal should be called
    expect(postJournal).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        event: 'REFUND_COMPLETED',
        lines: [
          { account: 2130, debit: 500.0, credit: 0 },
          { account: 1110, debit: 0, credit: 500.0 },
        ],
      })
    )
  })
})
