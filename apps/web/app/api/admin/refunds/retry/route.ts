import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundQueue } from '@/workers/queues'
import { logAdminAction } from '@/lib/admin/audit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify role is ADMIN
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { refundId } = await request.json()

    if (!refundId) {
      return NextResponse.json({ error: 'Missing refundId' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch refund to get booking details
    const { data: refund, error: fetchErr } = await adminClient
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .single()

    if (fetchErr || !refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
    }

    // Reset status to QUEUED in the DB before re-triggering the worker
    await adminClient
      .from('refunds')
      .update({ status: 'QUEUED', updated_at: new Date().toISOString() })
      .eq('id', refundId)

    await adminClient.from('refund_events').insert({
      refund_id: refundId,
      event_type: 'QUEUED',
      metadata: { trigger: 'ADMIN_MANUAL_RETRY', admin_user_id: user.id },
    })

    // Add back to refundQueue
    await refundQueue.add(
      'process-refund',
      {
        refundId: refund.id,
        bookingId: refund.booking_id,
        correlationId: refund.correlation_id,
      },
      {
        jobId: `${refund.idempotency_key}_retry_${Date.now()}`,
      }
    )

    // Log admin action for immutable audit trail
    await logAdminAction(
      'REFUND_RETRY',
      'refunds',
      refundId,
      `Manual retry triggered for refund ${refundId}. Status reset to QUEUED.`
    )

    return NextResponse.json({
      success: true,
      message: 'Refund worker job re-enqueued successfully.',
    })
  } catch (error: any) {
    console.error('[API: Admin Retry Refund] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
