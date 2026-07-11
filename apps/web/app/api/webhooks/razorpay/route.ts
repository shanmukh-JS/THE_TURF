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

    // 2. Extract Event ID from HTTP headers (NOT from payload body)
    const eventId = req.headers.get('x-razorpay-event-id')
    if (!eventId) {
      console.warn('Webhook missing x-razorpay-event-id header — rejecting')
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    const payload = JSON.parse(payloadString)
    const supabase = createAdminClient()

    // 3. Check Idempotency — reject duplicate events
    const { data: existingLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existingLog) {
      console.log(`Webhook ${eventId} already processed — skipping`)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }

    // 4. Process Event
    // Reconciliation: if the frontend /verify call failed, the webhook ensures booking is created
    if (payload.event === 'order.paid') {
      const entity = payload.payload?.payment?.entity
      const notes = payload.payload?.order?.entity?.notes

      if (notes?.slotId && notes?.venueId && notes?.customerId) {
        // Attempt rpc_book_slot. If already booked by the frontend verify flow,
        // it will throw "already booked" — expected and safe for reconciliation.
        const { error } = await supabase.rpc('rpc_book_slot', {
          p_slot_id: notes.slotId,
          p_venue_id: notes.venueId,
          p_customer_id: notes.customerId,
          p_total_amount: Number(notes.totalAmount),
          p_advance_paid: entity.amount / 100, // paise to rupees
          p_payment_id: entity.id,
        })

        if (error) {
          // If already booked, this is expected if the primary frontend flow succeeded.
          console.log(`Reconciliation: slot ${notes.slotId} — ${error.message}`)
        } else {
          console.log(`Reconciliation: booking created for slot ${notes.slotId} via webhook`)
        }
      }
    }

    // 5. Log Webhook (with provider column)
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
