import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js' // Assuming basic auth context initialization for now
import { OwnerPayableService } from '../../../../../services/payouts/ownerPayableService'
import { PayoutDomainError } from '../../../../../services/payouts/errors'

export async function POST(req: Request) {
  try {
    // 1. Authenticate & Authorize
    // (Mocked for demonstration, real app uses Next.js Auth / Supabase Auth)
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== 'Bearer SYSTEM_SECRET_TOKEN') {
      return NextResponse.json({ error: 'Unauthorized: System role required' }, { status: 401 })
    }

    // 2. Validate Request Body
    const body = await req.json()
    const { bookingId, ownerId, totalBookingAmount, platformCommissionPct, executedBy } = body
    if (!bookingId || !ownerId || !totalBookingAmount || !executedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 3. Initialize Service
    // In real env, pass the authenticated supabase client. Using generic one for mock structure.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const service = new OwnerPayableService(supabase)

    // 4. Execute Service
    const result = await service.createPayable({
      bookingId,
      ownerId,
      totalBookingAmount,
      platformCommissionPct: platformCommissionPct || 0.1, // Default 10% if not provided
      executedBy,
    })

    // 5. Log Success (Structured Logging)
    console.log(
      JSON.stringify({
        level: 'INFO',
        action: 'CREATE_PAYABLE',
        bookingId,
        payableId: result.payableId,
        executedBy,
        timestamp: new Date().toISOString(),
      })
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    if (error instanceof PayoutDomainError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 422 })
    }

    console.error('Unhandled error in owner-payables/create:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
