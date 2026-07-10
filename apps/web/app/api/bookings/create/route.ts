import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slotId } = await req.json()
    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Fetch slot to verify it's available and get price
    const { data: slot, error: slotError } = await adminClient
      .from('slots')
      .select('*, venues(owner_id, name)')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (slot.status !== 'Available') {
      return NextResponse.json({ error: 'Slot is no longer available' }, { status: 400 })
    }

    // 2. Fetch owner settings for auto-accept
    const { data: ownerSettings } = await adminClient
      .from('owner_settings')
      .select('auto_accept_bookings, notify_bookings, notify_email')
      .eq('owner_id', slot.venues.owner_id)
      .maybeSingle()

    const bookingStatus = ownerSettings?.auto_accept_bookings === false ? 'PENDING' : 'CONFIRMED'
    const advanceAmount = Math.round(slot.price * 0.5)

    // 3. Create the booking entry securely
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .insert({
        slot_id: slot.id,
        venue_id: slot.venue_id,
        customer_id: user.id,
        total_amount: slot.price,
        advance_paid: advanceAmount,
        status: bookingStatus,
      })
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // 4. Update the slot status securely
    await adminClient.from('slots').update({ status: 'Booked', is_booked: true }).eq('id', slot.id)

    // 5. Securely send notifications
    if (ownerSettings?.notify_bookings) {
      // Find owner profile user id
      const { data: ownerProfile } = await adminClient
        .from('owner_profiles')
        .select('user_id')
        .eq('id', slot.venues.owner_id)
        .maybeSingle()
      if (ownerProfile) {
        await adminClient.from('notifications').insert({
          user_id: ownerProfile.user_id,
          title: 'New Booking!',
          message: `${user.email} booked a slot at ${slot.venues.name} for ₹${slot.price}.`,
          type: 'BOOKING',
        })
      }
    }

    if (ownerSettings?.notify_email) {
      await adminClient.from('email_logs').insert({
        recipient_email: 'owner@turfgaming.com', // In a real app, fetch owner email
        subject: `New Booking at ${slot.venues.name}`,
        body: `You have received a new booking from ${user.email}.`,
        status: 'PENDING', // Will be picked up by the email worker
      })
    }

    return NextResponse.json({ booking })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
