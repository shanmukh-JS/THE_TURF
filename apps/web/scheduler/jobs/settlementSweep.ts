import { settlementQueue } from '../../workers/queues'

export async function enqueueSettlementSweep(): Promise<number> {
  // Sweeps pending settlements and re-enqueues for processing
  await settlementQueue.add('sweep-pending-settlements', {
    triggerTime: new Date().toISOString(),
  })
  return 1
}
