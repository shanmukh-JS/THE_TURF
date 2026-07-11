import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SettlementService } from '../../../../../services/payouts/settlementService'
import { PayoutDomainError } from '../../../../../services/payouts/errors'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    // 1. Webhook Signature Verification
    const signature = req.headers.get('x-provider-signature')
    const bodyText = await req.text()

    // Example basic validation (Replace with actual provider logic, e.g. Razorpay validation)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PROVIDER_WEBHOOK_SECRET || '')
      .update(bodyText)
      .digest('hex')
    if (signature !== expectedSignature && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(bodyText)

    // In a real system, you'd insert into `payout_provider_events` here to guarantee webhook idempotency
    // and then process it asynchronously. For Phase 3B orchestration demonstration, we parse and record.

    const { transferId, providerSettlementId, amount, settledAt, eventType } = payload

    if (eventType !== 'transfer.settled') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Execute Service
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const service = new SettlementService(supabase)

    // Mocking SYSTEM user ID for webhooks
    const systemUserId = '00000000-0000-0000-0000-000000000000'

    const result = await service.recordSettlement({
      transferId,
      providerSettlementId,
      amount,
      settledAt: new Date(settledAt),
      executedBy: systemUserId,
    })

    // 3. Log
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'WEBHOOK_SETTLEMENT',
        transferId,
        settlementId: result.settlementId,
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      if (error.code === 'ALREADY_SETTLED') {
        // Idempotent success
        return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 })
      }
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }
    console.error('Unhandled error in webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
