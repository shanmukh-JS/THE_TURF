import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PayoutBatchService } from '../../../../../../services/payouts/payoutBatchService'
import { PayoutDomainError } from '../../../../../../services/payouts/errors'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // 1. Authenticate & Authorize
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('FINANCE_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Finance Admin role required' },
        { status: 403 }
      )
    }

    const { approverId } = await req.json()
    if (!approverId) {
      return NextResponse.json({ error: 'Missing approverId' }, { status: 400 })
    }

    // 2. Execute Service
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const service = new PayoutBatchService(supabase)

    await service.approveBatch({
      batchId: id,
      approverId,
    })

    // 3. Log
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'APPROVE_BATCH',
        batchId: id,
        approverId,
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }
    console.error('Unhandled error in batches/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
