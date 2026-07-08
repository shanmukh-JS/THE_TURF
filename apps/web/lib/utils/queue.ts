// ============================================================================
// TRUF GAMING — Distributed Background Job Queue
// Powered by BullMQ and Redis.
// Offloads heavy tasks (emails, analytics, settlements) from API threads.
// ============================================================================

import { Queue, Worker, Job } from 'bullmq'
import { logger } from '@/lib/utils/logger'

// Fallback to local Redis if env is missing
const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}

/**
 * Main application queue for handling diverse asynchronous tasks.
 */
export const platformQueue = new Queue('PlatformQueue', { connection })

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
  return platformQueue.add(name, data, {
    delay: options?.delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 100, // Keep last 100 failed jobs for debugging
  })
}

// ============================================
// Worker Setup (Run this in a separate Node process in production)
// ============================================

export const createWorker = () => {
  return new Worker(
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
}
