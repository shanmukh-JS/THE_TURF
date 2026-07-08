import { NextResponse } from 'next/server'
import { verifyRazorpayWebhook } from '@/lib/payments/webhook'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const payloadString = await req.text()

    // 1. Verify Signature
    const isValid = verifyRazorpayWebhook(payloadString, signature)
    if (!isValid) {
      console.warn('Invalid Razorpay Webhook Signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(payloadString)
    const eventId =
      payload.headers && payload.headers['x-razorpay-event-id']
        ? payload.headers['x-razorpay-event-id']
        : payload.payload?.payment?.entity?.id // Fallback ID

    if (!eventId) {
      return NextResponse.json({ success: true }) // Ignore unrecognized events gracefully
    }

    const supabase = createAdminClient()

    // 2. Check Idempotency
    const { data: existingLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('event_id', eventId)
      .single()

    if (existingLog) {
      console.log(`Webhook ${eventId} already processed`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // 3. Process Event
    // We only process order.paid as a fallback reconciliation if the frontend failed to call /api/bookings/verify
    if (payload.event === 'order.paid') {
      const entity = payload.payload.payment.entity
      const notes = payload.payload.order.entity.notes

      if (notes?.slotId && notes?.venueId && notes?.customerId) {
        // We attempt to call rpc_book_slot. If it was already called by the frontend,
        // it will throw an error ("already booked"), which is fine for reconciliation.
        const { error } = await supabase.rpc('rpc_book_slot', {
          p_slot_id: notes.slotId,
          p_venue_id: notes.venueId,
          p_customer_id: notes.customerId,
          p_total_amount: Number(notes.totalAmount),
          p_advance_paid: entity.amount / 100, // from paise to rupees
          p_payment_id: entity.id,
        })

        if (error) {
          // If already booked, this is expected if the primary flow succeeded.
          console.log(`Reconciliation notice: slot ${notes.slotId} is already processed.`)
        }
      }
    }

    // 4. Log Webhook
    await supabase.from('webhook_logs').insert({
      event_id: eventId,
      provider: 'razorpay',
      event_type: payload.event,
      payload: payload,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
