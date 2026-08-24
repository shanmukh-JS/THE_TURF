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
    const limitResponse = await rateLimitGuard(req, 'booking')
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

    // Fetch slot to verify price and prevent client-side manipulation
    const adminClient = createAdminClient()
    const { data: slot } = await adminClient
      .from('slots')
      .select('price, status, start_time, date, venues(opening_time, closing_time)')
      .eq('id', slotId)
      .single()

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 })
    }

    if (slot.status !== 'Available') {
      return NextResponse.json({ error: 'Slot is no longer available for booking.' }, { status: 400 })
    }

    // Check if slot start time has already passed
    const now = new Date()
    const slotStart = slot.start_time.includes('T')
      ? new Date(slot.start_time)
      : new Date(`${slot.date}T${slot.start_time}`)

    if (slotStart.getTime() <= now.getTime()) {
      return NextResponse.json(
        { error: 'This slot has already started or passed and cannot be booked.' },
        { status: 400 }
      )
    }

    // Check if slot is within venue operating hours (evaluated in Asia/Kolkata timezone)
    const venue = slot.venues as any
    if (venue?.opening_time && venue?.closing_time) {
      const openParts = venue.opening_time.split(':').map(Number)
      const closeParts = venue.closing_time.split(':').map(Number)
      const openMin = (openParts[0] || 0) * 60 + (openParts[1] || 0)
      const closeMin = (closeParts[0] || 0) * 60 + (closeParts[1] || 0)

      let slotStartMin = 0
      try {
        const istTimeStr = slotStart.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
        const [h, m] = istTimeStr.split(':').map(Number)
        slotStartMin = (h || 0) * 60 + (m || 0)
      } catch {
        slotStartMin = slotStart.getHours() * 60 + slotStart.getMinutes()
      }

      const is24Hours =
        openMin === closeMin || (openMin === 0 && (closeMin === 0 || closeMin === 1440))
      if (!is24Hours) {
        if (closeMin > openMin) {
          // Standard day operating window (e.g. 06:00 to 23:00)
          if (slotStartMin < openMin || slotStartMin >= closeMin) {
            return NextResponse.json(
              { error: 'This slot is outside registered operating hours.' },
              { status: 400 }
            )
          }
        } else {
          // Overnight operating window (e.g. 06:00 to 02:00 next day)
          if (slotStartMin < openMin && slotStartMin >= closeMin) {
            return NextResponse.json(
              { error: 'This slot is outside registered operating hours.' },
              { status: 400 }
            )
          }
        }
      }
    }

    const expectedTotal = Number(slot.price)
    if (Math.abs(Number(totalAmount) - expectedTotal) > 0.01) {
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      )
    }

    const paidAmount = Number(advancePaid)
    if (
      Math.abs(paidAmount - expectedTotal) > 1 &&
      Math.abs(paidAmount - Math.round(expectedTotal * 0.5)) > 1
    ) {
      return NextResponse.json({ error: 'Payment amount mismatch.' }, { status: 400 })
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
    const { data: existingAudit } = await adminClient
      .from('payment_audit')
      .select('razorpay_order_id, status')
      .eq('checkout_id', checkoutId)
      .in('status', ['CHECKOUT_INITIATED', 'ORDER_CREATED', 'PAYMENT_PENDING'])
      .maybeSingle()

    const keyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      'rzp_test_TCI3ClZqEjTuvq'

    if (existingAudit?.razorpay_order_id) {
      // Return the existing order instead of creating a new one
      console.log(`Idempotent checkout: returning existing order for ${checkoutId}`)
      return NextResponse.json({
        keyId,
        order: {
          orderId: existingAudit.razorpay_order_id,
          amount: Number(advancePaid) * 100,
          currency: 'INR',
          key: keyId,
        },
        checkoutId,
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

    return NextResponse.json({
      order: {
        ...order,
        key: keyId,
      },
      keyId,
      checkoutId,
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    const message = error.message || error.error?.description || 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
