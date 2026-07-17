import { Worker, Job } from 'bullmq'
import { connection, QUEUES } from './queues'
import { RedisLock } from './redisLock'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function processRefundJob(job: Job) {
  const { refundId, bookingId, correlationId } = job.data

  console.log(`[Worker: Refund] Processing Job ${job.id} for Refund ID: ${refundId}`)

  // Distributed Lock
  const lock = new RedisLock(`lock:refund:${refundId}`)
  const lockOwner = job.id || Date.now().toString()

  const acquired = await lock.acquire(lockOwner)
  if (!acquired) {
    throw new Error(`Could not acquire lock for refund ${refundId}. Will retry.`)
  }

  try {
    // 1. Fetch Refund Data (with booking customer_id)
    const { data: refund, error: fetchErr } = await supabase
      .from('refunds')
      .select('*, bookings(customer_id)')
      .eq('id', refundId)
      .single()

    if (fetchErr || !refund) {
      throw new Error(`Refund record ${refundId} not found.`)
    }

    const booking = refund.bookings as any
    const customerId = booking?.customer_id || '00000000-0000-0000-0000-000000000000'

    // Check current state (Idempotence check)
    if (refund.status === 'COMPLETED') {
      console.log(`[Worker: Refund] Refund ${refundId} already completed. Idempotent success.`)
      return { success: true, idempotent: true }
    }

    // 2. Transition state to PROCESSING and write event
    await supabase
      .from('refunds')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', refundId)

    await supabase.from('refund_events').insert({
      refund_id: refundId,
      event_type: 'WORKER_STARTED',
      metadata: { jobId: job.id, attempt: job.attemptsMade + 1, correlationId },
    })

    // 3. Trigger Razorpay Refund
    const { getPaymentProvider } = await import('../lib/payments/factory')
    const provider = getPaymentProvider()

    console.log(
      `[Worker: Refund] Calling Razorpay Refund for payment ${refund.payment_id}, amount ${refund.amount}`
    )

    const amountInPaise = Math.round(Number(refund.amount) * 100)

    // Call Razorpay
    const refundResult = await provider.refund(refund.payment_id, amountInPaise)
    const providerRefundId =
      refundResult?.id || `ref_${(await import('crypto')).randomUUID().substring(0, 8)}`

    // 4. Update Refund Record with provider ID and log success event
    await supabase
      .from('refunds')
      .update({
        refund_id: providerRefundId,
        status: 'PROCESSING', // remains in PROCESSING state until webhook confirms
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)

    await supabase.from('refund_events').insert({
      refund_id: refundId,
      event_type: 'RAZORPAY_SUCCESS',
      metadata: { providerRefundId, status: refundResult?.status || 'initiated' },
    })

    // Publish refund.processing event
    const { emitRefundProcessingEvent } = await import('../lib/events/handlers')
    await emitRefundProcessingEvent({
      refundId,
      bookingId: refund.booking_id,
      userId: customerId,
      amount: Number(refund.amount),
      correlationId,
    })

    console.log(
      `[Worker: Refund] Refund ${refundId} accepted by Razorpay (Reference: ${providerRefundId}). Awaiting webhook.`
    )
    return { success: true, providerRefundId }
  } catch (error: any) {
    console.error(`[Worker: Refund] Error processing refund ${refundId}:`, error)

    // Fetch the refund's customer_id to publish event
    let customerId = '00000000-0000-0000-0000-000000000000'
    try {
      const { data: b } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('id', bookingId)
        .single()
      if (b) customerId = b.customer_id
    } catch (_) {}

    // Transition to RETRYING or FAILED depending on whether we have remaining attempts
    const nextStatus = job.attemptsMade < 4 ? 'RETRYING' : 'FAILED'

    await supabase
      .from('refunds')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', refundId)

    await supabase.from('refund_events').insert({
      refund_id: refundId,
      event_type: 'FAILED',
      metadata: { error: error.message || 'Unknown error', attemptsMade: job.attemptsMade + 1 },
    })

    // Publish refund.failed event
    try {
      const { emitRefundFailedEvent } = await import('../lib/events/handlers')
      await emitRefundFailedEvent({
        refundId,
        bookingId,
        userId: customerId,
        error: error.message || 'Unknown error',
        correlationId,
      })
    } catch (evtError) {
      console.error('[Worker: Refund] Failed to publish refund.failed event:', evtError)
    }

    throw error // Throw to trigger BullMQ retry/exponential backoff
  } finally {
    await lock.release(lockOwner)
  }
}

export const refundWorker = new Worker(QUEUES.REFUND, processRefundJob, { connection })
