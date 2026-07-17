import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { RedisLock } from './redisLock'
import { createClient } from '@supabase/supabase-js'
import { SettlementService } from '../services/payouts/settlementService'

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
const settlementService = new SettlementService(supabase)

export const settlementWorker = new Worker(
  QUEUES.SETTLEMENT,
  async (job: Job) => {
    if (job.name === 'sweep-pending-settlements') {
      console.log(`[Worker: Settlement] Sweeping pending settlements...`)
      // TODO: Implement Razorpay polling to find settled transfers and enqueue them individually.
      return { success: true, message: 'Sweep completed.' }
    }

    const { transferId, providerSettlementId, amount, settledAt } = job.data

    // Basic Idempotency log
    console.log(`[Worker: Settlement] Processing Job ${job.id} for Transfer ${transferId}`)

    // Distributed Lock
    const lock = new RedisLock(`lock:settlement:${transferId}`)
    const lockOwner = job.id || Date.now().toString()

    const acquired = await lock.acquire(lockOwner)
    if (!acquired) {
      throw new Error(`Could not acquire lock for transfer ${transferId}. Will retry.`)
    }

    try {
      const startTime = Date.now()

      // Execute RPC via service
      const result = await settlementService.recordSettlement({
        transferId,
        providerSettlementId,
        amount,
        settledAt: new Date(settledAt),
        executedBy: '00000000-0000-0000-0000-000000000000', // System user
      })

      const duration = Date.now() - startTime

      // Structured Log
      console.log(
        JSON.stringify({
          level: 'INFO',
          event: 'SettlementCompleted',
          jobId: job.id,
          transferId,
          settlementId: result.settlementId,
          durationMs: duration,
        })
      )

      return result
    } catch (error: any) {
      if (error.code === 'ALREADY_SETTLED') {
        console.log(
          `[Worker: Settlement] Transfer ${transferId} already settled. Idempotent success.`
        )
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
      backoffStrategies: {
        exponential: (attemptsMade, err) => Math.round(Math.pow(2, attemptsMade) * 1000),
      },
    },
  }
)
