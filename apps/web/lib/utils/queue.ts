// ============================================================================
// TRUF GAMING — Distributed Background Job Queue
// Powered by BullMQ and Redis.
// Offloads heavy tasks (emails, analytics, settlements) from API threads.
// ============================================================================

import { Queue, Worker, Job } from 'bullmq'
import { logger } from '@/lib/utils/logger'
import IORedis from 'ioredis'

// Fallback to local Redis if env is missing
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ for resilience
  enableOfflineQueue: false, // Fail fast if Redis is completely down
})

/**
 * Main application queue for handling diverse asynchronous tasks.
 */
export const platformQueue = new Queue('PlatformQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false, // Do not automatically remove, retain in DLQ
  },
})

export type JobPayloads = {
  send_email: { to: string; template: string; data: Record<string, unknown> }
  process_settlement: { ownerId: string; amount: number }
  generate_report: { adminId: string; dateRange: string }
}

/**
 * Enqueue a new background job with retries and exponential backoff.
 */
export async function enqueueJob<K extends keyof JobPayloads>(
  name: K,
  data: JobPayloads[K],
  options?: { delay?: number }
) {
  try {
    return await platformQueue.add(name, data, {
      delay: options?.delay,
    })
  } catch (err: any) {
    // If Redis is offline, we catch it here to prevent breaking primary transactions
    logger.error('Failed to enqueue background job', {
      error: err.message,
      jobName: name,
      payload: data,
    })
    // Implement fallback action or trigger PagerDuty alert here if critical
    return null
  }
}

// ============================================
// Worker Setup (Run this in a separate Node process in production)
// ============================================

export const createWorker = () => {
  const worker = new Worker(
    'PlatformQueue',
    async (job: Job) => {
      logger.info(`[Worker] Processing job ${job.name} (${job.id})`)

      switch (job.name) {
        case 'send_email':
          // Await email dispatch
          break
        case 'process_settlement':
          // Await settlement processing
          break
        case 'generate_report':
          // Await report generation
          break
        default:
          logger.warn(`[Worker] Unknown job type: ${job.name}`)
      }
    },
    { connection }
  )

  // DLQ and Metrics Tracking
  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (job) {
      logger.error(`[Worker/DLQ] Job ${job.id} failed after ${job.attemptsMade} attempts`, {
        job_id: job.id,
        queue: job.queueName,
        attempts: job.attemptsMade,
        failure_reason: err.message,
        stack_trace: err.stack,
        retry_count: job.opts.attempts,
        job_name: job.name,
      })
    }
  })

  worker.on('error', (err: Error) => {
    logger.error(`[Worker] Fatal worker error: ${err.message}`)
  })

  return worker
}
