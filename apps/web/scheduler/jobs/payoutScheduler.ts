import { payoutQueue } from '../../workers/queues'

export async function enqueuePayoutBatch(): Promise<number> {
  // Tells the payout worker to sweep owner_payables and create payout batches
  await payoutQueue.add(
    'create-daily-batches',
    {
      triggerTime: new Date().toISOString(),
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    }
  )

  return 1
}
