import { describe, it, expect, vi } from 'vitest'
import { SettlementService } from '../../services/payouts/settlementService'
import { PayoutDomainError, translatePostgresError } from '../../services/payouts/errors'
import { settlementQueue, payoutQueue, ownerPayableQueue } from '../../workers/queues'
import { createClient } from '@supabase/supabase-js'

describe('Pillar 3 - Worker Validation', () => {
  it('should process jobs idempotently when re-run', async () => {
    // 1. Verify that database error translator maps 'already settled' to ALREADY_SETTLED domain error
    const pgError = { message: 'Transfer xxxxxxxx is already settled' }
    const translated = translatePostgresError(pgError)

    expect(translated).toBeInstanceOf(PayoutDomainError)
    expect(translated.code).toBe('ALREADY_SETTLED')

    // 2. Test that SettlementService throws PayoutDomainError on RPC conflict
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'already settled' },
      }),
    } as any

    const service = new SettlementService(mockSupabase)

    await expect(
      service.recordSettlement({
        transferId: '00000000-0000-0000-0000-000000000000',
        providerSettlementId: 'SETTLE_1',
        amount: 1000,
        settledAt: new Date(),
        executedBy: '00000000-0000-0000-0000-000000000000',
      })
    ).rejects.toThrowError(PayoutDomainError)

    try {
      await service.recordSettlement({
        transferId: '00000000-0000-0000-0000-000000000000',
        providerSettlementId: 'SETTLE_1',
        amount: 1000,
        settledAt: new Date(),
        executedBy: '00000000-0000-0000-0000-000000000000',
      })
    } catch (err: any) {
      expect(err.code).toBe('ALREADY_SETTLED')
    }
  })

  it('should appropriately configure default retry attempts before moving to failed/DLQ', async () => {
    // Assert BullMQ queue options are configured for retry policy (attempts = 5, backoff exponential)
    expect(settlementQueue.opts.defaultJobOptions?.attempts).toBe(5)
    expect(settlementQueue.opts.defaultJobOptions?.backoff).toEqual({
      type: 'exponential',
      delay: 5000,
    })

    expect(payoutQueue.opts.defaultJobOptions?.attempts).toBe(5)
    expect(ownerPayableQueue.opts.defaultJobOptions?.attempts).toBe(5)
  })
})
