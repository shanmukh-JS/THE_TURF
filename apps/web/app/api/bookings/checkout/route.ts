import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bookingService } from '@/lib/services/bookingService'
import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: Request) {
  try {
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

    const order = await bookingService.startCheckout({
      slotId,
      venueId,
      customerId: user.id,
      totalAmount: Number(totalAmount),
      advancePaid: Number(advancePaid),
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
