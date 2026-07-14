import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
      checkoutId,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !slotId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    // Fetch slot to verify price and prevent payment amount manipulation
    const adminClient = createAdminClient()
    const { data: slot } = await adminClient.from('slots').select('price').eq('id', slotId).single()

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 })
    }

    const expectedTotal = Number(slot.price)
    if (Math.abs(Number(totalAmount) - expectedTotal) > 0.01) {
      return NextResponse.json({ error: 'Price verification failed.' }, { status: 400 })
    }

    const expectedAdvance = Math.round(expectedTotal * 0.5)
    if (Math.abs(Number(advancePaid) - expectedAdvance) > 1) {
      return NextResponse.json({ error: 'Advance payment verification failed.' }, { status: 400 })
    }

    // Log payment success in audit trail
    await adminClient.from('payment_audit').insert({
      user_id: user.id,
      checkout_id: checkoutId || null,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: 'PAYMENT_SUCCESS',
      amount: Number(advancePaid),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      metadata: { slotId, venueId, totalAmount },
    })

    try {
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

      // Update payment audit to BOOKING_CONFIRMED
      await adminClient
        .from('payment_audit')
        .update({ status: 'BOOKING_CONFIRMED', booking_id: bookingId })
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('status', 'PAYMENT_SUCCESS')

      // Update booking payment status
      await adminClient
        .from('bookings')
        .update({
          payment_status: 'PAYMENT_VERIFIED',
          checkout_id: checkoutId || null,
          razorpay_order_id,
        })
        .eq('id', bookingId)

      return NextResponse.json({ success: true, bookingId })
    } catch (verifyError: any) {
      // Log signature verification failure
      await adminClient.from('payment_audit').insert({
        user_id: user.id,
        checkout_id: checkoutId || null,
        razorpay_order_id,
        razorpay_payment_id,
        status: 'SIGNATURE_FAILED',
        amount: Number(advancePaid),
        error_message: verifyError.message,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      })
      throw verifyError
    }
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment Verification Failed' },
      { status: 400 }
    )
  }
}
