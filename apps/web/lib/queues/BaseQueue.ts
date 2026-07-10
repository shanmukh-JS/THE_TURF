import { Queue, ConnectionOptions } from 'bullmq'

let redisConnection: ConnectionOptions | string | undefined

export function getRedisConfig(): ConnectionOptions | string | undefined {
  if (redisConnection !== undefined) return redisConnection

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    console.warn(
      '[QueueManager] REDIS_URL missing. BullMQ is operating in synchronous fallback mode.'
    )
    redisConnection = undefined
    return undefined
  }

  // BullMQ connection properties can accept a direct connection URI string
  redisConnection = redisUrl
  return redisConnection
}

// Map base queues
export const notificationQueues: Record<string, Queue | null> = {}

export function getQueue(priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): Queue | null {
  const config = getRedisConfig()
  if (!config) return null // Fallback mode

  const queueName = `tg_notifications_${priority.toLowerCase()}`
  if (!notificationQueues[queueName]) {
    notificationQueues[queueName] = new Queue(queueName, {
      connection: config as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // Start backoff at 1 minute
        },
        removeOnComplete: true,
      },
    })
  }

  return notificationQueues[queueName]
}
