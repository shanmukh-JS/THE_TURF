import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { RedisLock } from './redisLock'
import { createClient } from '@supabase/supabase-js'
import { PayoutBatchService } from '../services/payouts/payoutBatchService'
import { getPaymentProvider } from '../lib/payments/factory'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
const batchService = new PayoutBatchService(supabase)

export const payoutBatchWorker = new Worker(
  QUEUES.PAYOUT,
  async (job: Job) => {
    const { batchId, provider, executedBy } = job.data

    console.log(`[Worker: PayoutBatch] Processing Job ${job.id} for Batch ${batchId}`)

    const lock = new RedisLock(`lock:batch:${batchId}`)
    const lockOwner = job.id || Date.now().toString()

    const acquired = await lock.acquire(lockOwner)
    if (!acquired) {
      throw new Error(`Could not acquire lock for batch ${batchId}. Will retry.`)
    }

    try {
      const startTime = Date.now()

      // Integrate RazorpayX Payouts
      const provider = getPaymentProvider()

      // In reality, we would query the payables belonging to this batch.
      // For now we mock the account and total amount since we don't have the batch details fetch inline.
      // Let's assume we fetch batch sum and the owner's linked bank account.

      // Mock fetch for demonstration
      const amount = 50000
      const ownerAccountId = 'fa_XXXXXXXXXXXXXXXX'

      // Attempt Payout
      const payoutResult = await provider.createPayout({
        accountId: ownerAccountId,
        amount,
        currency: 'INR',
        referenceId: batchId,
      })

      if (
        payoutResult.status !== 'processed' &&
        payoutResult.status !== 'processing' &&
        payoutResult.status !== 'created'
      ) {
        throw new Error(`Payout failed with status ${payoutResult.status}`)
      }

      // Only update ledger if payout was created successfully
      const result = await batchService.executeBatch({
        batchId,
        provider: 'razorpay',
        executedBy,
      })

      const duration = Date.now() - startTime

      console.log(
        JSON.stringify({
          level: 'INFO',
          event: 'PayoutBatchCreated',
          jobId: job.id,
          batchId,
          transfersCreated: result.transfersCreated,
          durationMs: duration,
        })
      )

      return result
    } catch (error: any) {
      if (error.code === 'INVALID_STATE_TRANSITION') {
        console.log(`[Worker: PayoutBatch] Batch ${batchId} already processed. Idempotent success.`)
        return { success: true, idempotent: true }
      }
      throw error
    } finally {
      await lock.release(lockOwner)
    }
  },
  {
    connection,
    settings: {
      backoffStrategy: (attemptsMade: number) => Math.round(Math.pow(2, attemptsMade) * 1000),
    },
  }
)
