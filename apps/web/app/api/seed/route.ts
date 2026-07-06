import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to seed data' }, { status: 401 })
  }

  // 2. Ensure user has a customer profile
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    // If not exists, create one
    await supabase.from('customer_profiles').insert({
      user_id: user.id,
      full_name: 'Test Customer',
    })
  }

  // 3. Create dummy owner profile
  const { data: owner } = await supabase.from('owner_profiles').select('id').limit(1).single()
  let ownerId = owner?.id

  if (!ownerId) {
    const { data: newOwner } = await supabase
      .from('owner_profiles')
      .insert({
        user_id: user.id, // Just using current user for convenience
        full_name: 'Admin Owner',
        business_name: 'Admin Sports',
      })
      .select('id')
      .single()
    ownerId = newOwner?.id
  }

  // 4. Create City & Area
  const { data: city } = await supabase
    .from('cities')
    .upsert({ name: 'Hyderabad', state: 'Telangana' })
    .select('id')
    .single()
  const { data: area } = await supabase
    .from('areas')
    .upsert({ name: 'Madhapur', city_id: city?.id })
    .select('id')
    .single()

  // 5. Create a Venue
  const { data: venue } = await supabase
    .from('venues')
    .insert({
      owner_id: ownerId,
      name: 'Olympia Turf',
      address: '123 Test St',
      city_id: city?.id,
      area_id: area?.id,
      verification_status: 'VERIFIED',
      pitches: 2,
    })
    .select('id')
    .single()

  // 6. Create a Slot for tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const startTime = new Date(tomorrow)
  startTime.setHours(19, 0, 0, 0) // 7 PM
  const endTime = new Date(tomorrow)
  endTime.setHours(20, 0, 0, 0) // 8 PM

  const { data: slot } = await supabase
    .from('slots')
    .insert({
      venue_id: venue?.id,
      date: tomorrowStr,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      price: 1200,
      is_booked: true,
    })
    .select('id')
    .single()

  // 7. Create a Booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      slot_id: slot?.id,
      venue_id: venue?.id,
      customer_id: user.id,
      total_amount: 1200,
      advance_paid: 600,
      status: 'CONFIRMED',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Successfully added a test booking!',
    bookingId: booking?.id,
  })
}
