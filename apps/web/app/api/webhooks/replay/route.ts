import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../../../../lib/logger'
import { settlementQueue } from '../../../../workers/queues'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { webhookEventId, adminId } = await req.json()

    if (!webhookEventId || !adminId) {
      return NextResponse.json({ error: 'Missing webhookEventId or adminId' }, { status: 400 })
    }

    // 1. Fetch the original event
    const { data: originalEvent, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', webhookEventId)
      .single()

    if (fetchError || !originalEvent) {
      return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 })
    }

    // 2. Create a fresh audit entry for the replay
    const { data: replayEvent, error: replayError } = await supabase
      .from('webhook_events')
      .insert({
        provider: originalEvent.provider,
        event_id: originalEvent.event_id + '_replay_' + Date.now(),
        event_type: originalEvent.event_type,
        signature: originalEvent.signature,
        payload: originalEvent.payload,
        processing_status: 'PENDING',
        retry_count: originalEvent.retry_count + 1,
      })
      .select('id')
      .single()

    if (replayError) {
      throw replayError
    }

    logger.info(`Admin ${adminId} replayed webhook event ${originalEvent.event_id}`, {
      trace_id: replayEvent.id,
      worker_name: 'WebhookReplay',
    })

    // 3. Re-enqueue the job
    const eventType = originalEvent.event_type
    const payload = originalEvent.payload

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity
      if (paymentEntity) {
        await settlementQueue.add('process-payment-settlement', {
          webhookEventId: replayEvent.id,
          paymentId: paymentEntity.id,
          orderId: paymentEntity.order_id,
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
        })
      }
    }

    return NextResponse.json({ status: 'ok', replayId: replayEvent.id })
  } catch (error: any) {
    logger.error('Failed to replay webhook', { error: error.message })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
