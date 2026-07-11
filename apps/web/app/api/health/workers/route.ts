import { NextResponse } from 'next/server'
import {
  settlementQueue,
  payoutQueue,
  reconciliationQueue,
  ownerPayableQueue,
  deadLetterQueue,
  connection,
} from '../../../../workers/queues'
import { schedulerQueue } from '../../../../scheduler/queue'

export async function GET() {
  try {
    const redisStatus = connection.status
    const isRedisReady = redisStatus === 'ready'

    const queues = {
      settlement: {
        active: await settlementQueue.getActiveCount(),
        waiting: await settlementQueue.getWaitingCount(),
        failed: await settlementQueue.getFailedCount(),
        delayed: await settlementQueue.getDelayedCount(),
      },
      payout: {
        active: await payoutQueue.getActiveCount(),
        waiting: await payoutQueue.getWaitingCount(),
        failed: await payoutQueue.getFailedCount(),
        delayed: await payoutQueue.getDelayedCount(),
      },
      reconciliation: {
        active: await reconciliationQueue.getActiveCount(),
        waiting: await reconciliationQueue.getWaitingCount(),
        failed: await reconciliationQueue.getFailedCount(),
        delayed: await reconciliationQueue.getDelayedCount(),
      },
      ownerPayable: {
        active: await ownerPayableQueue.getActiveCount(),
        waiting: await ownerPayableQueue.getWaitingCount(),
        failed: await ownerPayableQueue.getFailedCount(),
        delayed: await ownerPayableQueue.getDelayedCount(),
      },
      deadLetter: {
        count: await deadLetterQueue.count(), // Number of dead letters
      },
      scheduler: {
        active: await schedulerQueue.getActiveCount(),
        waiting: await schedulerQueue.getWaitingCount(),
        failed: await schedulerQueue.getFailedCount(),
        delayed: await schedulerQueue.getDelayedCount(),
      },
    }

    const healthStatus = isRedisReady ? 200 : 503

    return NextResponse.json(
      {
        status: isRedisReady ? 'healthy' : 'degraded',
        redis: redisStatus,
        queues,
        timestamp: new Date().toISOString(),
      },
      { status: healthStatus }
    )
  } catch (error) {
    console.error('Error fetching worker health:', error)
    return NextResponse.json({ status: 'down', error: 'Internal Server Error' }, { status: 500 })
  }
}
