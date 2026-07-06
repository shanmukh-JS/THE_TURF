import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

console.log('Razorpay Webhook Function up and running!')

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    // In production, verify the signature using razorpay-webhook secret
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!signature || !webhookSecret) {
      console.warn('Signature or Secret missing - skipping validation for dev')
    }

    const payload = JSON.parse(rawBody)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (payload.event === 'payment.captured') {
      const paymentId = payload.payload.payment.entity.id
      const orderId = payload.payload.payment.entity.order_id

      console.log(`Payment captured: ${paymentId}`)

      // Update Booking status
      const { data, error } = await supabaseClient
        .from('bookings')
        .update({ status: 'CONFIRMED', payment_id: paymentId })
        .eq('payment_id', orderId)

      if (error) throw error

      // Here we would also insert into commissions, replacing the old payout.worker.ts
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
})
