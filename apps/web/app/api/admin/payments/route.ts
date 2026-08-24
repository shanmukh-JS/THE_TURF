import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const roleCheck = await requireRole(['ADMIN'])
    if (roleCheck.error) return roleCheck.error

    const supabase = createAdminClient()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users(email),
        venues(name, verification_status, owner_profiles(full_name))
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: bookings || [] })
  } catch (err: any) {
    console.error('GET /api/admin/payments error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const roleCheck = await requireRole(['ADMIN'])
    if (roleCheck.error) return roleCheck.error
    const adminUser = roleCheck.user!

    const { paymentId, action } = await req.json()
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing paymentId or action' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let newStatus = 'PENDING'
    if (action === 'RELEASE') newStatus = 'RELEASED'
    if (action === 'HOLD') newStatus = 'HELD'
    if (action === 'REFUND') newStatus = 'REFUNDED'

    const { error } = await supabase
      .from('bookings')
      .update({ payout_status: newStatus })
      .eq('id', paymentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Insert audit log
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action: `Payout ${newStatus}`,
        target_type: 'bookings',
        target_id: paymentId,
        reason: `Admin updated payout status to ${newStatus}`,
      })
    } catch (logErr) {
      console.warn('Audit log error:', logErr)
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (err: any) {
    console.error('PATCH /api/admin/payments error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update payout status' }, { status: 500 })
  }
}
