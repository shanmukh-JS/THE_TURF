import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    // 1. Authenticate User
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminDb = createAdminClient()

    // 2. Verify Booking Customer matches User
    const { data: booking } = await adminDb
      .from('bookings')
      .select('id, customer_id')
      .eq('id', bookingId)
      .single()

    if (!booking || booking.customer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized booking access' }, { status: 403 })
    }

    // 3. Upsert a rating token valid for 7 days
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: ratingToken, error } = await adminDb
      .from('rating_tokens')
      .upsert(
        {
          booking_id: bookingId,
          expires_at: expiry,
          used: false,
        },
        { onConflict: 'booking_id' }
      )
      .select('token')
      .single()

    if (error || !ratingToken) {
      throw error || new Error('Failed to upsert rating token')
    }

    return NextResponse.json({
      success: true,
      token: ratingToken.token,
    })
  } catch (err: any) {
    console.error('Failed to resolve rating token:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
