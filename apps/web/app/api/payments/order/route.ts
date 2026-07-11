import { NextResponse } from 'next/server'
import { getPaymentProvider } from '../../../../lib/payments/factory'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { amount, currency, receiptId, bookingId } = await req.json()

    const provider = getPaymentProvider()

    // 1. Create the order at the payment gateway
    const order = await provider.createOrder({
      amount,
      currency,
      receiptId,
      notes: { bookingId },
    })

    // 2. We optionally save the order ID in our database, e.g., on the booking
    const { error } = await supabase
      .from('bookings')
      .update({ payment_gateway_order_id: order.id })
      .eq('id', bookingId)

    if (error) {
      console.warn(`Failed to link order ${order.id} to booking ${bookingId}`)
      // Proceed anyway, the webhook is the source of truth
    }

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (err: any) {
    console.error('Error creating payment order:', err)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
