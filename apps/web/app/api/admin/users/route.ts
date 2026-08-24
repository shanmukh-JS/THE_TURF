import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request) {
  try {
    const roleCheck = await requireRole(['ADMIN'])
    if (roleCheck.error) return roleCheck.error
    const adminUser = roleCheck.user!

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Delete associated child records safely
    await supabase.from('notifications').delete().eq('user_id', userId)
    await supabase.from('user_notification_preferences').delete().eq('user_id', userId)
    await supabase.from('customer_profiles').delete().eq('user_id', userId)
    await supabase.from('owner_profiles').delete().eq('user_id', userId)

    // 2. Delete from public.users table
    const { error: userError } = await supabase.from('users').delete().eq('id', userId)
    if (userError) {
      console.warn('Error deleting from public.users:', userError.message)
    }

    // 3. Delete from Supabase Auth (auth.users)
    try {
      await supabase.auth.admin.deleteUser(userId)
    } catch (authErr: any) {
      console.warn('Error deleting from auth.users:', authErr.message)
    }

    // 4. Audit Log
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action: 'User Deleted',
        target_type: 'users',
        target_id: userId,
        reason: 'Admin deleted user account and auth credentials',
      })
    } catch (logErr) {
      console.warn('Audit log error:', logErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/admin/users error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete user' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const roleCheck = await requireRole(['ADMIN'])
    if (roleCheck.error) return roleCheck.error
    const adminUser = roleCheck.user!

    const { userId, isSuspended } = await req.json()
    if (!userId || typeof isSuspended !== 'boolean') {
      return NextResponse.json({ error: 'Missing userId or isSuspended' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('users')
      .update({ is_suspended: isSuspended })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If the user is a turf owner, automatically disable or enable all their venues
    const { data: ownerProfiles } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', userId)

    if (ownerProfiles && ownerProfiles.length > 0) {
      const ownerIds = ownerProfiles.map((p) => p.id)
      await supabase
        .from('venues')
        .update({
          is_disabled: isSuspended,
          verification_status: isSuspended ? 'SUSPENDED' : 'APPROVED',
        })
        .in('owner_id', ownerIds)
    }

    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        action: isSuspended ? 'User Suspended' : 'User Activated',
        target_type: 'users',
        target_id: userId,
        reason: `Admin updated user suspension state to ${isSuspended}`,
      })
    } catch (logErr) {
      console.warn('Audit log error:', logErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PATCH /api/admin/users error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update user status' }, { status: 500 })
  }
}
