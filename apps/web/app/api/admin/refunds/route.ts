import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (userProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // 1. Fetch refunds with joined booking and venue details
    const { data: refundsData, error: refundsError } = await adminClient
      .from('refunds')
      .select(
        `
        *,
        bookings(
          id,
          customer_id,
          total_amount,
          advance_paid,
          status,
          venues(name, address)
        )
      `
      )
      .order('created_at', { ascending: false })

    if (refundsError) {
      console.error('Error fetching refunds from DB:', refundsError)
    }

    let allRefunds = refundsData || []

    // 2. Also check if there are cancelled bookings that don't have a row in `refunds` yet
    const { data: cancelledBookings } = await adminClient
      .from('bookings')
      .select(
        `
        id,
        customer_id,
        total_amount,
        advance_paid,
        status,
        cancellation_reason,
        cancelled_by,
        cancelled_at,
        refund_status,
        refund_amount,
        refund_reference,
        refund_completed_at,
        created_at,
        venues(name, address)
      `
      )
      .eq('status', 'CANCELLED')
      .order('cancelled_at', { ascending: false })

    const existingRefundBookingIds = new Set(allRefunds.map((r: any) => r.booking_id))

    if (cancelledBookings) {
      for (const cb of cancelledBookings) {
        if (!existingRefundBookingIds.has(cb.id)) {
          // Synthetic refund representation from cancelled booking
          allRefunds.push({
            id: `cb_${cb.id}`,
            booking_id: cb.id,
            payment_id: cb.refund_reference || `pay_${cb.id.slice(0, 8)}`,
            amount: Number(cb.refund_amount || cb.advance_paid || 0),
            status: cb.refund_status || (cb.refund_amount > 0 ? 'QUEUED' : 'COMPLETED'),
            cancellation_reason: cb.cancellation_reason || 'Player requested cancellation',
            cancelled_by: cb.cancelled_by || 'PLAYER',
            created_at: cb.cancelled_at || cb.created_at || new Date().toISOString(),
            updated_at: cb.refund_completed_at || cb.cancelled_at || cb.created_at || new Date().toISOString(),
            idempotency_key: `ref_${cb.id}`,
            bookings: {
              id: cb.id,
              customer_id: cb.customer_id,
              total_amount: cb.total_amount,
              advance_paid: cb.advance_paid,
              status: cb.status,
              venues: cb.venues,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true, refunds: allRefunds })
  } catch (err: any) {
    console.error('Admin refunds GET API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
