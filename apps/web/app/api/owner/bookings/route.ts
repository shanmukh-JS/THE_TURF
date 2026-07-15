import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // 2. Get owner profile
    const { data: profile } = await adminClient
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ bookings: [] })
    }

    // 3. Fetch bookings for owner's venues using admin client (bypasses RLS issues)
    const { data: bookingsData, error } = await adminClient
      .from('bookings')
      .select(
        `
        id, 
        total_amount, 
        status, 
        customer_id,
        venue_id,
        slot_id,
        slots(date, start_time),
        venues!inner(name, owner_id)
      `
      )
      .eq('venues.owner_id', profile.id)

    if (error) {
      console.error('Error fetching owner bookings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!bookingsData || bookingsData.length === 0) {
      return NextResponse.json({ bookings: [] })
    }

    // 4. Fetch customer profiles for these bookings
    const customerIds = Array.from(new Set(bookingsData.map((b) => b.customer_id)))
    const { data: customerProfiles } = await adminClient
      .from('customer_profiles')
      .select('user_id, full_name')
      .in('user_id', customerIds)

    const profileMap = new Map()
    if (customerProfiles) {
      customerProfiles.forEach((p) => profileMap.set(p.user_id, p))
    }

    let enhancedBookings = bookingsData.map((b) => ({
      ...b,
      customer_profiles: profileMap.get(b.customer_id) || null,
    }))

    // Sort by slots date descending
    enhancedBookings.sort((a, b) => {
      const dateA =
        a.slots && !Array.isArray(a.slots) ? new Date((a.slots as any).date).getTime() : 0
      const dateB =
        b.slots && !Array.isArray(b.slots) ? new Date((b.slots as any).date).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({ bookings: enhancedBookings })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
