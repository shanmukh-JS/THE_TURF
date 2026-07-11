import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const serverSupabase = await createServerClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  return user && user.user_metadata?.role === 'ADMIN' ? user : null
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 })
    }

    const { venueId, verificationStatus, adminNotes, reason } = await req.json()

    if (!venueId || !verificationStatus) {
      return NextResponse.json({ error: 'Missing venueId or verificationStatus' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Update venue status
    const { error: updateError } = await supabase
      .from('venues')
      .update({ verification_status: verificationStatus })
      .eq('id', venueId)

    if (updateError) {
      console.error('Error updating venue status:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 2. Log admin action
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUser.id,
      action: `Venue status set to: ${verificationStatus}`,
      target_type: 'venues',
      target_id: venueId,
      reason: `Verification updated to ${verificationStatus}. Notes: ${adminNotes || 'None'}. Remarks: ${reason || 'None'}`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('POST update-status error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
