import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // 1. Authenticate user from session (NOT from request body)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookingId, status, notifyUser } = body

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 2. Resolve owner profile from authenticated user's session
    const { data: ownerProfile } = await adminClient
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Not authorized as a venue owner' }, { status: 403 })
    }

    // 3. Verify this owner owns the venue for this booking
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('id, venue_id, customer_id, total_amount, venues(owner_id)')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venue = booking.venues as any
    if (venue.owner_id !== ownerProfile.id) {
      return NextResponse.json({ error: 'You do not own this venue' }, { status: 403 })
    }

    // 4. Update Booking Status
    const { error: updateError } = await adminClient
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (updateError) {
      throw updateError
    }

    // 5. Send Notification securely
    if (notifyUser && booking.customer_id) {
      let title = ''
      let message = ''
      let type = 'INFO'

      if (status === 'CONFIRMED') {
        title = 'Payment Confirmed!'
        message = `Payment confirmed for booking #${bookingId.substring(0, 8).toUpperCase()}. Amount: ₹${booking.total_amount}`
        type = 'SUCCESS'
      } else if (status === 'CANCELLED') {
        title = 'Booking Cancelled'
        message = `Your booking #${bookingId.substring(0, 8).toUpperCase()} has been cancelled by the venue owner.`
        type = 'ERROR'
      }

      if (title && message) {
        await adminClient.from('notifications').insert({
          user_id: booking.customer_id,
          title,
          message,
          type,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in /api/bookings/update-status:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
