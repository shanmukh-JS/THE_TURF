import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { createClient } from '@supabase/supabase-js'
import { ReconciliationService } from '../services/payouts/reconciliationService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
const reconciliationService = new ReconciliationService(supabase)

export const reconciliationWorker = new Worker(
  QUEUES.RECONCILIATION,
  async (job: Job) => {
    console.log(`[Worker: Reconciliation] Processing Job ${job.id}`)

    try {
      const startTime = Date.now()

      const report = await reconciliationService.getDailyReconciliationView()

      // In a full implementation, this worker would cross-check the DB view
      // with the actual Provider Gateway balances.
      // e.g. const gatewayBalance = await razorpay.balance.fetch();
      // Then generate alerts if total_in_transit_clearing != gateway pending.

      const duration = Date.now() - startTime

      console.log(
        JSON.stringify({
          level: 'INFO',
          event: 'ReconciliationCompleted',
          jobId: job.id,
          report,
          durationMs: duration,
        })
      )

      return report
    } catch (error: any) {
      throw error
    }
  },
  { connection }
)
