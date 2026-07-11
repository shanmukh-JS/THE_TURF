import { Queue, QueueEvents, DefaultJobOptions } from 'bullmq'
import IORedis from 'ioredis'

// 1. Redis Connection
// For local development use redis://localhost:6379, for production use Upstash Redis URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
})

// 2. Standard Job Options
// Enterprise defaults: exponential backoff, limited retries, clean up completed jobs
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000, // Starts at 5s, then 25s, 125s, etc.
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
}

// 3. Queues
export const QUEUES = {
  SETTLEMENT: 'settlement.queue',
  PAYOUT: 'payout.queue',
  RECONCILIATION: 'reconciliation.queue',
  OWNER_PAYABLE: 'owner-payable.queue',
  DEAD_LETTER: 'dead-letter.queue',
}

// Initialize Queues
export const settlementQueue = new Queue(QUEUES.SETTLEMENT, { connection, defaultJobOptions })
export const payoutQueue = new Queue(QUEUES.PAYOUT, { connection, defaultJobOptions })
export const reconciliationQueue = new Queue(QUEUES.RECONCILIATION, {
  connection,
  defaultJobOptions,
})
export const ownerPayableQueue = new Queue(QUEUES.OWNER_PAYABLE, { connection, defaultJobOptions })
export const deadLetterQueue = new Queue(QUEUES.DEAD_LETTER, { connection })

// 4. Queue Events for Observability
export const settlementQueueEvents = new QueueEvents(QUEUES.SETTLEMENT, { connection })
export const payoutQueueEvents = new QueueEvents(QUEUES.PAYOUT, { connection })
export const reconciliationQueueEvents = new QueueEvents(QUEUES.RECONCILIATION, { connection })
export const ownerPayableQueueEvents = new QueueEvents(QUEUES.OWNER_PAYABLE, { connection })

// Example logger attachment (Can be extended into a real logger)
;[
  settlementQueueEvents,
  payoutQueueEvents,
  reconciliationQueueEvents,
  ownerPayableQueueEvents,
].forEach((events) => {
  events.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[BullMQ] Job ${jobId} completed in ${events.name}`, returnvalue)
  })

  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[BullMQ] Job ${jobId} failed in ${events.name}`, failedReason)
    // In a real system, you might manually push to dead-letter queue after all attempts fail
    // if not relying on BullMQ's built-in failed sets.
  })
})
