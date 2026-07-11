import { NextResponse } from 'next/server'
import { getPaymentProvider } from '../../../../lib/payments/factory'
import { createClient } from '@supabase/supabase-js'
import { settlementQueue } from '../../../../workers/queues'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const rawBody = await req.text()
    const provider = getPaymentProvider()

    // 1. Verify Signature
    if (!provider.verifyWebhook(rawBody, signature)) {
      console.warn('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(rawBody)

    // Specifically looking for payment.captured or similar successful events
    const eventId = req.headers.get('x-razorpay-event-id') || payload.id
    const eventType = payload.event

    // 2. Idempotency Check & 3. Persist Event
    const { data: insertedEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'razorpay',
        event_id: eventId,
        event_type: eventType,
        signature,
        payload,
      })
      .select('id')
      .single()

    if (insertError) {
      // If error is unique_violation, it means we already received this webhook (duplicate)
      if (insertError.code === '23505') {
        console.log(`Webhook ${eventId} already processed.`)
        return NextResponse.json(
          { status: 'ok', message: 'Duplicate event ignored' },
          { status: 200 }
        )
      }
      throw insertError // Re-throw other DB errors
    }

    // 4. Enqueue background work based on event type
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload.payment.entity

      await settlementQueue.add('process-payment-settlement', {
        webhookEventId: insertedEvent.id,
        paymentId: paymentEntity.id,
        orderId: paymentEntity.order_id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
      })
    }

    // 5. Return quickly
    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('Error processing webhook:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
