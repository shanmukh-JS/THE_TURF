import { reconciliationQueue } from '../../workers/queues'

export async function enqueueReconciliation(): Promise<number> {
  await reconciliationQueue.add('hourly-reconciliation', {
    triggerTime: new Date().toISOString(),
  })
  return 1
}
