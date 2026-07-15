import { Worker, Job } from 'bullmq'
import { getRedisConfig } from '../queues/BaseQueue'
import { notificationService } from '../services/notifications/NotificationService'
import { createAdminClient } from '@/lib/supabase/admin'

const workers: Worker[] = []

export function startWorkers() {
  const config = getRedisConfig()
  if (!config) {
    console.warn('[Workers] Redis connection not found. Skipping BullMQ Worker initialization.')
    return
  }

  const priorities = ['critical', 'high', 'medium', 'low']

  for (const priority of priorities) {
    const queueName = `tg_notifications_${priority}`

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const payload = job.data
        console.log(`[Worker] Processing job ${job.id} on queue ${queueName}`)

        // Legacy setup deprecated by EventBus architecture
        // const result = await notificationService.dispatch(payload)

        // if (!result.success) {
        //   throw new Error(result.error || 'Notification delivery failed')
        // }
      },
      {
        connection: config as any,
        concurrency: priority === 'critical' || priority === 'high' ? 10 : 2,
      }
    )

    worker.on('failed', async (job: Job | undefined, err: Error) => {
      console.error(`[Worker] Job ${job?.id} failed on queue ${queueName}:`, err.message)

      if (job && job.attemptsMade >= 5) {
        // Retries exhausted! Redirect to Dead Letter Queue auditing
        console.error(`[Worker] DLQ Triggered: Job ${job.id} permanently failed after 5 attempts.`)

        const supabase = createAdminClient()
        await supabase.from('notification_logs').insert({
          action: 'DLQ_RED_ALERT',
          error_stack: `DLQ execution failed: ${err.message}. Retries exhausted.`,
          request_payload: job.data,
        })
      }
    })

    worker.on('completed', (job: Job) => {
      console.log(`[Worker] Job ${job.id} completed on queue ${queueName}`)
    })

    workers.push(worker)
    console.log(`[Worker] Initialized queue listener for: ${queueName}`)
  }
}

export function stopWorkers() {
  workers.forEach((w) => w.close())
  console.log('[Worker] Stopped all background queue listeners.')
}
