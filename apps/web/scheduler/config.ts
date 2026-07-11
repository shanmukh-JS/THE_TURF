// apps/web/scheduler/config.ts
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

export const schedulerConfig = {
  ownerPayableCron: process.env.OWNER_PAYABLE_CRON || '0 2 * * *',
  payoutBatchCron: process.env.PAYOUT_BATCH_CRON || '0 3 * * *',
  reconciliationCron: process.env.RECONCILIATION_CRON || '0 * * * *',
  settlementSweepCron: process.env.SETTLEMENT_SWEEP_CRON || '*/15 * * * *',
  statementCron: process.env.STATEMENT_CRON || '0 1 1 * *',
  queueCleanupCron: process.env.QUEUE_CLEANUP_CRON || '0 4 * * *',
  healthCheckCron: process.env.HEALTH_CHECK_CRON || '*/5 * * * *',
}
