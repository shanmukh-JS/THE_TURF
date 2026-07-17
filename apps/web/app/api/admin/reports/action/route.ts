import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const serverSupabase = await createServerClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  if (!user) return null
  const { data: dbUser } = await serverSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  return dbUser?.role === 'ADMIN' ? user : null
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 })
    }

    const { reportId, action, venueId, ownerId } = await req.json()

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = createAdminClient()
    let detailsText = ''

    if (action === 'resolve') {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'RESOLVED' })
        .eq('id', reportId)
      if (error) throw error
      detailsText = 'Report marked as resolved'
    } else if (action === 'suspend_turf') {
      if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 })
      const { error } = await supabase
        .from('venues')
        .update({ is_disabled: true, verification_status: 'REJECTED' })
        .eq('id', venueId)
      if (error) throw error

      await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', reportId)
      detailsText = `Turf suspended following report review`
    } else if (action === 'suspend_owner') {
      if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 })
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: true })
        .eq('id', ownerId)
      if (error) throw error

      await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', reportId)
      detailsText = `Owner suspended following report review`
    } else if (action === 'unsuspend_turf') {
      if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 })
      const { error } = await supabase
        .from('venues')
        .update({ is_disabled: false, verification_status: 'APPROVED' })
        .eq('id', venueId)
      if (error) throw error
      detailsText = `Turf unsuspended following report review`
    } else if (action === 'unsuspend_owner') {
      if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 })
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: false })
        .eq('id', ownerId)
      if (error) throw error
      detailsText = `Owner unsuspended following report review`
    } else if (action === 'delete') {
      const { error } = await supabase.from('reports').delete().eq('id', reportId)
      if (error) throw error
      detailsText = 'Report deleted permanently'
    }

    // Log admin action
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUser.id,
      action: `Report Action: ${action}`,
      target_type: 'reports',
      target_id: reportId,
      reason: detailsText,
    })

    return NextResponse.json({ success: true, detailsText })
  } catch (err: any) {
    console.error('POST report action error:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
