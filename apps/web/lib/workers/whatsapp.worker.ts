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

        if (job.name === 'payment.refund') {
          const { bookingId, paymentId, amount, customerId, reason } = payload
          console.log(
            `[Worker: Refund] Initiating refund for booking ${bookingId}, payment ${paymentId}, amount ${amount}`
          )

          const supabase = createAdminClient()

          // 1. Trigger the refund via Razorpay provider
          const { getPaymentProvider } = await import('@/lib/payments/factory')
          const provider = getPaymentProvider()

          // Amount in paise
          const amountInPaise = Math.round(amount * 100)
          const refundResult = await provider.refund(paymentId, amountInPaise)
          const refundId =
            refundResult?.id || `ref_${(await import('crypto')).randomUUID().substring(0, 8)}`

          // 2. Update booking payment_status to REFUND_COMPLETED
          const { error: bookingUpdateErr } = await supabase
            .from('bookings')
            .update({ payment_status: 'REFUND_COMPLETED' })
            .eq('id', bookingId)
          if (bookingUpdateErr) throw bookingUpdateErr

          // 3. Log in payment_audit
          const { error: auditErr } = await supabase.from('payment_audit').insert({
            booking_id: bookingId,
            user_id: customerId,
            razorpay_payment_id: paymentId,
            status: 'REFUND_COMPLETED',
            amount: amount,
            metadata: { refund_id: refundId, reason },
          })
          if (auditErr) throw auditErr

          // 4. Create financial transaction record for refund
          let txId = (await import('crypto')).randomUUID()
          const { data: tx, error: txErr } = await supabase
            .from('financial_transactions')
            .insert({
              id: txId,
              transaction_type: 'REFUND',
              status: 'COMPLETED',
              provider: 'RAZORPAY',
              provider_reference: refundId,
              amount: amount,
              currency: 'INR',
              booking_id: bookingId,
              payment_id: paymentId,
            })
            .select('id')
            .single()
          if (txErr) {
            console.error('[Worker: Refund] Failed to insert financial_transactions:', txErr)
            throw txErr
          }
          if (tx) {
            txId = tx.id
          }

          // 5. Post to the financial ledger: REFUND_COMPLETED
          const { postJournal } = await import('@/lib/accounting/postJournal')
          const { ChartOfAccounts, BusinessEvent } = await import('@/lib/accounting/types')

          const ledgerResult = await postJournal(supabase, {
            event: BusinessEvent.REFUND_COMPLETED,
            transactionId: txId,
            idempotencyKey: `ledger_refund_${bookingId}_${refundId}`,
            lines: [
              { account: ChartOfAccounts.REFUND_PENDING_LIABILITY, debit: amount, credit: 0 },
              { account: ChartOfAccounts.OPERATING_BANK, debit: 0, credit: amount },
            ],
          })

          if (!ledgerResult.success) {
            console.error('[Worker: Refund] Ledger posting failed:', ledgerResult.error)
            throw new Error(`Ledger posting failed: ${ledgerResult.error}`)
          }

          console.log(
            `[Worker: Refund] Refund successfully processed for booking ${bookingId}. Refund ID: ${refundId}`
          )
        }
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
