import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const bookingId = searchParams.get('bookingId')

    if (!token || !bookingId) {
      return NextResponse.json({ error: 'Missing token or bookingId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Verify Secure Token
    const { data: ratingToken, error: tokenError } = await supabase
      .from('rating_tokens')
      .select('expires_at, used')
      .eq('token', token)
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (tokenError || !ratingToken) {
      return NextResponse.json({ error: 'Invalid rating token.' }, { status: 404 })
    }

    if (ratingToken.used) {
      return NextResponse.json({ error: 'This token has already been used.' }, { status: 400 })
    }

    if (new Date(ratingToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This token has expired.' }, { status: 400 })
    }

    // 2. Fetch booking & venue name
    const { data: booking } = await supabase
      .from('bookings')
      .select('venues(name)')
      .eq('id', bookingId)
      .single()

    return NextResponse.json({
      success: true,
      venueName: (booking?.venues as any)?.name || 'the Turf',
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
