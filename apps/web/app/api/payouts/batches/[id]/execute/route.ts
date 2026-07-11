import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PayoutBatchService } from '../../../../../../services/payouts/payoutBatchService'
import { PayoutDomainError } from '../../../../../../services/payouts/errors'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate & Authorize
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('FINANCE_SERVICE')) {
      return NextResponse.json(
        { error: 'Unauthorized: Finance Service role required' },
        { status: 403 }
      )
    }

    const { provider, executedBy } = await req.json()
    if (!provider || !executedBy) {
      return NextResponse.json({ error: 'Missing provider or executedBy' }, { status: 400 })
    }

    // 2. Execute Service
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const service = new PayoutBatchService(supabase)

    const result = await service.executeBatch({
      batchId: params.id,
      provider,
      executedBy,
    })

    // 3. Log
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'EXECUTE_BATCH',
        batchId: params.id,
        transfersCreated: result.transfersCreated,
        executedBy,
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }
    console.error('Unhandled error in batches/[id]/execute:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
