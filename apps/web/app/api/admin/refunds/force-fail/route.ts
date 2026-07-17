import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/admin/audit'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'admin_api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const roleCheck = await requireRole(['ADMIN'])
    if (roleCheck.error) return roleCheck.error

    const { refundId, reason } = await request.json()

    if (!refundId) {
      return NextResponse.json({ error: 'Missing refundId' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch refund
    const { data: refund, error: fetchErr } = await adminClient
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .single()

    if (fetchErr || !refund) {
      return NextResponse.json({ error: 'Refund record not found' }, { status: 404 })
    }

    const providerRefundId = refund.refund_id || refund.idempotency_key

    // Call the database function to atomically fail
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('rpc_fail_refund_v1', {
      p_provider_refund_id: providerRefundId,
      p_error_message: reason || 'Refund marked failed by admin decision',
      p_correlation_id: refund.correlation_id,
    })

    if (rpcError) {
      console.error('[API: Admin Force Fail] RPC Error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message || 'Force fail database update failed' },
        { status: 400 }
      )
    }

    // Log admin action for immutable audit trail
    await logAdminAction(
      'REFUND_FORCE_FAIL',
      'refunds',
      refundId,
      reason || 'Refund marked failed by admin decision.'
    )

    return NextResponse.json({
      success: true,
      message: 'Refund force failed successfully.',
      result: rpcResult,
    })
  } catch (error: any) {
    console.error('[API: Admin Force Fail] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
