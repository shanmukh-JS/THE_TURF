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

    // 3. Map Provider Event to Business Event (Domain Language)
    let businessEvent: string | null = null;
    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      businessEvent = 'BOOKING_PAID';
    } else if (payload.event === 'payment.failed') {
      businessEvent = 'PAYMENT_FAILED';
    } else if (payload.event === 'refund.processed') {
      businessEvent = 'REFUND_COMPLETED';
    }

    if (!businessEvent) {
      console.log(`Ignoring unsupported webhook event: ${payload.event}`);
      return NextResponse.json({ success: true, message: 'Ignored unsupported event' });
    }

    // Extract necessary IDs
    const entity = payload.payload?.payment?.entity || {};
    const notes = payload.payload?.order?.entity?.notes || entity.notes || {};
    const paymentId = entity.id;
    const bookingId = notes.bookingId || notes.slotId; // Depends on how frontend passes it
    const amountPaid = entity.amount ? entity.amount / 100 : 0; // Convert from paise to rupees

    if (!paymentId) {
      console.warn('Webhook payload missing payment ID');
      return NextResponse.json({ error: 'Invalid payload missing payment_id' }, { status: 400 });
    }

    // 4. Call the Atomic PostgreSQL RPC
    const { data: result, error } = await supabase.rpc('process_payment_webhook', {
      p_razorpay_event_id: eventId,
      p_business_event: businessEvent,
      p_booking_id: bookingId || null,
      p_payment_id: paymentId,
      p_amount: amountPaid,
      p_payload: payload,
    });

    if (error) {
      console.error('Database Error in process_payment_webhook:', error.message);
      // We throw 500 to trigger Razorpay's exponential backoff retry mechanism
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (result === 'ALREADY_PROCESSED') {
      console.log(`Webhook ${eventId} already processed — treating as success no-op`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    if (result === 'SUCCESS') {
      // 5. Enqueue Side Effects (outside of the database transaction)
      // TODO: Replace with real event pub/sub or queueing (e.g. Inngest, Upstash QStash)
      console.log(`Successfully processed webhook ${eventId}. Queueing side effects...`);
      
      // We asynchronously trigger side-effects without blocking the 200 OK response
      queueSideEffects({
        businessEvent,
        bookingId,
        paymentId
      }).catch(err => console.error('Failed to queue side effects:', err));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown state' }, { status: 500 });
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Dummy implementation for side effects to ensure they run decoupled
async function queueSideEffects(data: any) {
  // E.g. Send Email, WhatsApp, Push Notification
  console.log('Side effects queued:', data);
}
