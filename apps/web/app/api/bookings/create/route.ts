import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'booking_mutation')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role-based guard: only owners and admins can create free bookings (walk-ins/offline)
    // Players must use the Razorpay payment flow via /api/bookings/checkout + /api/bookings/verify
    const adminClient = createAdminClient()
    const { data: userRecord } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRecord || !['OWNER', 'ADMIN'].includes(userRecord.role)) {
      return NextResponse.json(
        {
          error:
            'Only venue owners and admins can create direct bookings. Players must use the payment flow.',
        },
        { status: 403 }
      )
    }

    const { slotId } = await req.json()
    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 })
    }

    // 1. Fetch slot to verify it's available and get price
    const { data: slot, error: slotError } = await adminClient
      .from('slots')
      .select('*, venues(owner_id, name, opening_time, closing_time)')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (slot.status !== 'Available') {
      return NextResponse.json({ error: 'Slot is no longer available' }, { status: 400 })
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

    // 2. Fetch owner settings for auto-accept
    const { data: ownerSettings } = await adminClient
      .from('owner_settings')
      .select('auto_accept_bookings, notify_bookings, notify_email')
      .eq('owner_id', slot.venues.owner_id)
      .maybeSingle()

    const bookingStatus = ownerSettings?.auto_accept_bookings === false ? 'PENDING' : 'CONFIRMED'
    const advanceAmount = Math.round(slot.price * 0.5)

    // 3. Create booking atomically to prevent concurrent double-booking
    const { data: bookingId, error: bookingError } = await adminClient.rpc('rpc_book_slot', {
      p_slot_id: slot.id,
      p_venue_id: slot.venue_id,
      p_customer_id: user.id,
      p_total_amount: slot.price,
      p_advance_paid: advanceAmount,
      p_payment_id: null,
      p_status: bookingStatus,
    })

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // Fetch the created booking for the response
    const { data: booking } = await adminClient
      .from('bookings')
      .select()
      .eq('id', bookingId)
      .single()

    // 5. Securely send notifications
    let ownerEmail: string | undefined

    if (ownerSettings?.notify_bookings || ownerSettings?.notify_email) {
      // Find owner profile user id and email
      const { data: ownerProfile } = await adminClient
        .from('owner_profiles')
        .select('user_id, users(email)')
        .eq('id', slot.venues.owner_id)
        .maybeSingle()

      if (ownerProfile) {
        ownerEmail = (ownerProfile.users as any)?.email

        if (ownerSettings?.notify_bookings) {
          const slotDate = new Date(slot.start_time).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          const slotTime = new Date(slot.start_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
          await adminClient.from('notifications').insert({
            user_id: ownerProfile.user_id,
            title: 'New Booking!',
            message: `${user.email} booked a slot at ${slot.venues.name} on ${slotDate} at ${slotTime} for ₹${slot.price}.`,
            type: 'BOOKING',
          })
        }
      }
    }

    if (ownerSettings?.notify_email) {
      if (ownerEmail) {
        await adminClient.from('email_logs').insert({
          recipient_email: ownerEmail,
          subject: `New Booking at ${slot.venues.name}`,
          body: `You have received a new booking from ${user.email}.`,
          status: 'PENDING', // Will be picked up by the email worker
        })
      } else {
        console.warn(
          `Could not send notification email for venue ${slot.venues.name} - no owner email found`
        )
      }
    }

    return NextResponse.json({ booking })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
