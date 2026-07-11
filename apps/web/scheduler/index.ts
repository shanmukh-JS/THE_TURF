import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { schedulerQueue } from './queue'
import { schedulerConfig } from './config'
import { logExecutionStart, logExecutionFinish } from './logger'

// Job Enqueuers (Stubs to be implemented)
import { enqueueNightlyOwnerPayables } from './jobs/nightlyOwnerPayables'
import { enqueuePayoutBatch } from './jobs/payoutScheduler'
import { enqueueReconciliation } from './jobs/reconciliationScheduler'
import { enqueueSettlementSweep } from './jobs/settlementSweep'
import { enqueueStatementGeneration } from './jobs/statementScheduler'
import { enqueueMaintenance } from './jobs/maintenanceScheduler'
import { enqueueHealthCheck } from './jobs/healthScheduler'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function processSchedulerJob(job: Job) {
  const startTime = Date.now()
  const executionId = await logExecutionStart(job.name, new Date(job.timestamp))

  if (!executionId) {
    throw new Error(`Failed to initialize execution log for ${job.name}`)
  }

  let jobsEnqueued = 0
  try {
    switch (job.name) {
      case 'nightlyOwnerPayables':
        jobsEnqueued = await enqueueNightlyOwnerPayables()
        break
      case 'payoutBatch':
        jobsEnqueued = await enqueuePayoutBatch()
        break
      case 'reconciliation':
        jobsEnqueued = await enqueueReconciliation()
        break
      case 'settlementSweep':
        jobsEnqueued = await enqueueSettlementSweep()
        break
      case 'statementGeneration':
        jobsEnqueued = await enqueueStatementGeneration()
        break
      case 'queueMaintenance':
        jobsEnqueued = await enqueueMaintenance()
        break
      case 'healthCheck':
        jobsEnqueued = await enqueueHealthCheck()
        break
      default:
        console.warn(`Unknown scheduler job: ${job.name}`)
    }

    const duration = Date.now() - startTime
    await logExecutionFinish(executionId, 'COMPLETED', jobsEnqueued, duration)
  } catch (error: any) {
    const duration = Date.now() - startTime
    await logExecutionFinish(executionId, 'FAILED', jobsEnqueued, duration, error.message)
    throw error
  }
}

// 1. Worker Setup
const schedulerWorker = new Worker('scheduler', processSchedulerJob, {
  connection,
  concurrency: 1, // Process one scheduled trigger at a time
})

schedulerWorker.on('completed', (job) => {
  console.log(`[Scheduler] Completed ${job.name}`)
})
schedulerWorker.on('failed', (job, err) => {
  console.error(`[Scheduler] Failed ${job?.name}: ${err.message}`)
})

// 2. Register Repeatable Jobs
async function registerSchedules() {
  console.log('[Scheduler] Registering cron schedules (UTC)...')

  // Clear existing repeatable jobs to avoid duplicates if cron changes
  const repeatableJobs = await schedulerQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await schedulerQueue.removeRepeatableByKey(job.key)
  }

  await schedulerQueue.add(
    'nightlyOwnerPayables',
    {},
    {
      repeat: { pattern: schedulerConfig.ownerPayableCron },
    }
  )

  await schedulerQueue.add(
    'payoutBatch',
    {},
    {
      repeat: { pattern: schedulerConfig.payoutBatchCron },
    }
  )

  await schedulerQueue.add(
    'reconciliation',
    {},
    {
      repeat: { pattern: schedulerConfig.reconciliationCron },
    }
  )

  await schedulerQueue.add(
    'settlementSweep',
    {},
    {
      repeat: { pattern: schedulerConfig.settlementSweepCron },
    }
  )

  await schedulerQueue.add(
    'statementGeneration',
    {},
    {
      repeat: { pattern: schedulerConfig.statementCron },
    }
  )

  await schedulerQueue.add(
    'queueMaintenance',
    {},
    {
      repeat: { pattern: schedulerConfig.queueCleanupCron },
    }
  )

  await schedulerQueue.add(
    'healthCheck',
    {},
    {
      repeat: { pattern: schedulerConfig.healthCheckCron },
    }
  )

  console.log('[Scheduler] Schedules registered successfully.')
}

registerSchedules().catch(console.error)

// Graceful shutdown
process.on('SIGTERM', async () => {
  await schedulerWorker.close()
  process.exit(0)
})
