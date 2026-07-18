import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'booking_mutation')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')
    const refundId = searchParams.get('refundId')

    if (!bookingId && !refundId) {
      return NextResponse.json(
        { error: 'Missing bookingId or refundId query parameter' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Fetch user role
    const { data: dbUser } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = dbUser?.role === 'ADMIN'

    // 2. Fetch refund with booking + venue details
    let query = adminClient.from('refunds').select(`
        *,
        bookings (
          customer_id,
          venue_id,
          venues (
            owner_id,
            name
          )
        )
      `)

    if (refundId) {
      query = query.eq('id', refundId)
    } else if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data: refund, error: fetchError } = await query.maybeSingle()

    if (fetchError) {
      console.error('[API: Get Refund] Fetch Error:', fetchError)
      return NextResponse.json({ error: 'Failed to retrieve refund details' }, { status: 500 })
    }

    if (!refund) {
      return NextResponse.json({ error: 'Refund record not found' }, { status: 404 })
    }

    // 3. Verify access authorization
    const booking = refund.bookings as any
    const customerId = booking?.customer_id
    const ownerId = booking?.venues?.owner_id

    const isCustomer = customerId === user.id
    const isOwner = ownerId === user.id

    if (!isAdmin && !isCustomer && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this refund' },
        { status: 403 }
      )
    }

    // 4. Fetch refund event timeline
    const { data: events } = await adminClient
      .from('refund_events')
      .select('*')
      .eq('refund_id', refund.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      data: {
        ...refund,
        events: events || [],
      },
    })
  } catch (error: any) {
    console.error('[API: Get Refund] Unexpected Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
