import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { RedisLock } from './redisLock'
import { createClient } from '@supabase/supabase-js'
import { OwnerPayableService } from '../services/payouts/ownerPayableService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
const ownerPayableService = new OwnerPayableService(supabase)

export const ownerPayableWorker = new Worker(
  QUEUES.OWNER_PAYABLE,
  async (job: Job) => {
    const { bookingId, ownerId, totalBookingAmount, executedBy } = job.data

    console.log(`[Worker: OwnerPayable] Processing Job ${job.id} for Booking ${bookingId}`)

    const lock = new RedisLock(`lock:booking_payable:${bookingId}`)
    const lockOwner = job.id || Date.now().toString()

    const acquired = await lock.acquire(lockOwner)
    if (!acquired) {
      throw new Error(`Could not acquire lock for booking ${bookingId}. Will retry.`)
    }

    try {
      const startTime = Date.now()

      const result = await ownerPayableService.createPayable({
        bookingId,
        ownerId,
        totalBookingAmount,
        executedBy,
      })

      const duration = Date.now() - startTime

      console.log(
        JSON.stringify({
          level: 'INFO',
          event: 'OwnerPayableCalculated',
          jobId: job.id,
          bookingId,
          payableId: result.payableId,
          durationMs: duration,
        })
      )

      return result
    } catch (error: any) {
      if (error.code === 'DUPLICATE_ENTITY') {
        console.log(
          `[Worker: OwnerPayable] Payable for booking ${bookingId} already exists. Idempotent success.`
        )
        return { success: true, idempotent: true }
      }
      throw error
    } finally {
      await lock.release(lockOwner)
    }
  },
  { connection }
)
