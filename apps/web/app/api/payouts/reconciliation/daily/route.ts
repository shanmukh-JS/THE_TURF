import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ReconciliationService } from '../../../../../services/payouts/reconciliationService'
import { PayoutDomainError } from '../../../../../services/payouts/errors'

export async function GET(req: Request) {
  try {
    // 1. Authenticate & Authorize
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('FINANCE_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Finance Admin role required' },
        { status: 403 }
      )
    }

    // 2. Execute Service
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const service = new ReconciliationService(supabase)

    const report = await service.getDailyReconciliationView()

    // 3. Log
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'FETCH_RECONCILIATION',
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json(report, { status: 200 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }
    console.error('Unhandled error in reconciliation/daily:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
