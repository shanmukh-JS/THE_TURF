// In a real app, you would have a statementsQueue or similar. For now we will add to reconciliationQueue as a proxy or just create a new one.
import { Queue } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export const statementQueue = new Queue('statements', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
})

export async function enqueueStatementGeneration(): Promise<number> {
  await statementQueue.add('generate-monthly-statements', {
    triggerTime: new Date().toISOString(),
  })
  return 1
}
