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
        created_at,
        slot_id,
        slots(date, start_time),
        venues!inner(name, owner_id),
        customer_profiles(full_name)
      `
      )
      .eq('venues.owner_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching owner bookings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookings: bookingsData || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
