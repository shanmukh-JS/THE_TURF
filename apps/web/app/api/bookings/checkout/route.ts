import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingService } from '@/lib/services/bookingService'
import { rateLimitGuard } from '@/lib/utils/rateLimiter'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    console.log('DEBUG ENV:', {
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      RAZORPAY_SECRET: process.env.RAZORPAY_SECRET ? 'SET' : 'NOT SET',
    })
    const limitResponse = rateLimitGuard(req, 'booking')
    if (limitResponse) return limitResponse

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { slotId, venueId, totalAmount, advancePaid } = body

    if (!slotId || !venueId || !totalAmount || !advancePaid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Idempotency: generate a deterministic checkout ID from user + slot + timestamp window
    // This prevents double-click creating two Razorpay orders
    const timeWindow = Math.floor(Date.now() / 30000) // 30-second window
    const checkoutId = crypto
      .createHash('sha256')
      .update(`${user.id}_${slotId}_${timeWindow}`)
      .digest('hex')
      .substring(0, 24)

    // Check if a checkout was already initiated for this exact combination
    const adminClient = createAdminClient()
    const { data: existingAudit } = await adminClient
      .from('payment_audit')
      .select('razorpay_order_id, status')
      .eq('checkout_id', checkoutId)
      .in('status', ['CHECKOUT_INITIATED', 'ORDER_CREATED', 'PAYMENT_PENDING'])
      .maybeSingle()

    if (existingAudit?.razorpay_order_id) {
      // Return the existing order instead of creating a new one
      console.log(`Idempotent checkout: returning existing order for ${checkoutId}`)
      return NextResponse.json({
        order: {
          orderId: existingAudit.razorpay_order_id,
          amount: Number(advancePaid) * 100,
          currency: 'INR',
        },
      })
    }

    // Log checkout initiation
    await adminClient.from('payment_audit').insert({
      user_id: user.id,
      checkout_id: checkoutId,
      status: 'CHECKOUT_INITIATED',
      amount: Number(advancePaid),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      metadata: { slotId, venueId, totalAmount },
    })

    const order = await bookingService.startCheckout({
      slotId,
      venueId,
      customerId: user.id,
      totalAmount: Number(totalAmount),
      advancePaid: Number(advancePaid),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    })

    // Update audit with Razorpay order ID
    await adminClient
      .from('payment_audit')
      .update({
        razorpay_order_id: order.orderId,
        status: 'ORDER_CREATED',
      })
      .eq('checkout_id', checkoutId)

    return NextResponse.json({ order, checkoutId })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
