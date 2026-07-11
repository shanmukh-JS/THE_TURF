import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PayoutDomainError } from '../../../../../services/payouts/errors'

export async function POST(req: Request) {
  try {
    // 1. Authenticate & Authorize
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('FINANCE_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Finance Admin role required' },
        { status: 403 }
      )
    }

    const { referenceId, createdBy, items } = await req.json()
    if (!referenceId || !createdBy || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required batch fields' }, { status: 400 })
    }

    // 2. Execute Logic (In reality, this would call a create_payout_batch_v1 RPC)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Mock RPC invocation for creating a batch and inserting items
    // const { data, error } = await supabase.rpc('create_payout_batch_v1', { p_reference_id: referenceId, p_created_by: createdBy, p_items: items });

    // 3. Log
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'CREATE_BATCH',
        referenceId,
        itemCount: items.length,
        createdBy,
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json({ success: true, batchId: 'mock-batch-id-for-now' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }
    console.error('Unhandled error in batches/create:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
