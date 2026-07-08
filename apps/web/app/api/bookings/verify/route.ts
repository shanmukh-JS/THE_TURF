import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bookingService } from '@/lib/services/bookingService'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      slotId,
      venueId,
      totalAmount,
      advancePaid,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !slotId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    const bookingId = await bookingService.verifyPaymentAndBook({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      slotId,
      venueId,
      customerId: user.id,
      totalAmount: Number(totalAmount),
      advancePaid: Number(advancePaid),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    })

    return NextResponse.json({ success: true, bookingId })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment Verification Failed' },
      { status: 400 }
    )
  }
}
