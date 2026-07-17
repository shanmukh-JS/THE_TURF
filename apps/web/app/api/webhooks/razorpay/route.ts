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
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const rawBody = await req.text()
    const provider = getPaymentProvider()

    // 1. Verify Signature
    if (!provider.verifyWebhook(rawBody, signature)) {
      console.warn('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Specifically looking for payment.captured or similar successful events
    const eventId = req.headers.get('x-razorpay-event-id') || payload.id
    const eventType = payload.event

    // 2. Idempotency Check & 3. Persist Event
    const { data: insertedEvent, error: insertError } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'razorpay',
        event_id: eventId,
        event_type: eventType,
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
    } else if (eventType === 'refund.processed') {
      const refundEntity = payload.payload.refund.entity
      const correlationId = refundEntity.notes?.correlationId || crypto.randomUUID()

      console.log(
        `[Webhook: Razorpay] Processing refund.processed event for refund ${refundEntity.id}`
      )

      const { data: result, error: rpcError } = await supabase.rpc('rpc_complete_refund_v1', {
        p_provider_refund_id: refundEntity.id,
        p_correlation_id: correlationId,
      })

      if (rpcError) {
        console.error('[Webhook: Razorpay] Failed to process rpc_complete_refund_v1:', rpcError)
        throw rpcError
      }

      console.log('[Webhook: Razorpay] Completed refund transaction successfully:', result)

      // Publish refund.completed event and trigger notification flow
      try {
        const resObj = result as any
        const { emitRefundCompletedEvent, emitBookingCancelledEvent } =
          await import('../../../../lib/events/handlers')

        // Fetch details for customer notifications
        const { data: b } = await supabase
          .from('bookings')
          .select(
            'id, customer_id, total_amount, venues(name), users(phone, email, customer_profiles(full_name))'
          )
          .eq('id', resObj.booking_id)
          .single()

        if (b) {
          const userRec = b.users as any
          const ownerProfile = userRec?.customer_profiles
          const venue = b.venues as any

          await emitRefundCompletedEvent({
            refundId: resObj.refund_id,
            bookingId: resObj.booking_id,
            userId: b.customer_id,
            amount: Number(resObj.amount),
            correlationId,
          })

          await emitBookingCancelledEvent({
            bookingId: resObj.booking_id,
            userId: b.customer_id,
            phone: userRec?.phone || '',
            fullName:
              (Array.isArray(ownerProfile) ? ownerProfile[0] : ownerProfile)?.full_name || 'Player',
            venueName: venue?.name || 'the Turf',
            amount: resObj.amount.toString(),
            reason: 'Booking cancelled (Refund processed successfully)',
          })
        }
      } catch (evtError) {
        console.error('[Webhook: Razorpay] Failed to trigger webhook success events:', evtError)
      }
    } else if (eventType === 'refund.failed') {
      const refundEntity = payload.payload.refund.entity
      const correlationId = refundEntity.notes?.correlationId || crypto.randomUUID()

      console.log(
        `[Webhook: Razorpay] Processing refund.failed event for refund ${refundEntity.id}`
      )

      const { data: result, error: rpcError } = await supabase.rpc('rpc_fail_refund_v1', {
        p_provider_refund_id: refundEntity.id,
        p_error_message: refundEntity.error_description || 'Razorpay reported failure',
        p_correlation_id: correlationId,
      })

      if (rpcError) {
        console.error('[Webhook: Razorpay] Failed to process rpc_fail_refund_v1:', rpcError)
        throw rpcError
      }

      console.log('[Webhook: Razorpay] Failed refund transaction logged successfully:', result)

      // Publish refund.failed event
      try {
        const resObj = result as any
        const { emitRefundFailedEvent } = await import('../../../../lib/events/handlers')

        const { data: b } = await supabase
          .from('bookings')
          .select('customer_id')
          .eq('id', resObj.booking_id)
          .single()

        await emitRefundFailedEvent({
          refundId: resObj.refund_id,
          bookingId: resObj.booking_id,
          userId: b?.customer_id || '00000000-0000-0000-0000-000000000000',
          error: refundEntity.error_description || 'Razorpay reported failure',
          correlationId,
        })
      } catch (evtError) {
        console.error('[Webhook: Razorpay] Failed to trigger webhook failure events:', evtError)
      }
    }

    // 5. Return quickly
    return NextResponse.json({ status: 'ok' })
  } catch (err: any) {
    console.error('Error processing webhook:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
