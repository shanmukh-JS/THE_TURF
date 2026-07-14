import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate Owner
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (dbUser?.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Unauthorized. Only venue owners can scan check-ins.' },
        { status: 401 }
      )
    }

    const { qrCode } = await req.json()
    if (!qrCode) {
      return NextResponse.json({ error: 'Missing QR Code token' }, { status: 400 })
    }

    const adminDb = createAdminClient()

    // 2. Query booking by QR Code
    const { data: booking, error } = await adminDb
      .from('bookings')
      .select(
        'id, customer_id, total_amount, status, check_in_status, slots(date, start_time), venues(name)'
      )
      .eq('qr_code', qrCode)
      .maybeSingle()

    if (error || !booking) {
      return NextResponse.json({ error: 'Invalid QR Code. Booking not found.' }, { status: 404 })
    }

    if (booking.check_in_status === 'CHECKED_IN') {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: 'Player is already checked in.',
        booking,
      })
    }

    // 3. Mark check-in status
    const { error: updateError } = await adminDb
      .from('bookings')
      .update({
        check_in_status: 'CHECKED_IN',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (updateError) {
      throw updateError
    }

    // 4. Trigger Check-in Welcome message (asynchronously)
    try {
      const { data: customerRecord } = await adminDb
        .from('customer_profiles')
        .select('full_name')
        .eq('user_id', booking.customer_id)
        .maybeSingle()

      const { data: userPhone } = await adminDb
        .from('users')
        .select('phone')
        .eq('id', booking.customer_id)
        .single()

      // Enqueue welcome login/checkin notification
      const { globalEventBus } = await import('@/lib/events/EventBus')
      await globalEventBus.publish({
        eventType: 'booking.checkin',
        version: 1,
        bookingId: booking.id,
        userId: booking.customer_id,
        payload: {
          recipient: userPhone?.phone || '',
          templateName: 'booking_checkin_welcome',
          variables: {
            Player: customerRecord?.full_name || 'Player',
            Venue: (booking.venues as any)?.name || 'the Turf',
          },
        },
      })
    } catch (welcomeErr) {
      console.error('Failed to trigger welcome check-in WhatsApp:', welcomeErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Player checked in successfully!',
      booking,
    })
  } catch (err: any) {
    console.error('Check-in error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
