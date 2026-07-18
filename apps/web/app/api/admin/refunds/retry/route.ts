import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundQueue } from '@/workers/queues'
import { logAdminAction } from '@/lib/admin/audit'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'admin_api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { user, error: roleError } = await requireRole(['ADMIN'])
    if (roleError || !user)
      return roleError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { refundId } = await req.json()

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
