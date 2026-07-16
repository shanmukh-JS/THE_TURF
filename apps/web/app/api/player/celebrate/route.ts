import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { celebratedLevel } = body

    if (typeof celebratedLevel !== 'number' || celebratedLevel < 1) {
      return NextResponse.json({ error: 'Invalid celebratedLevel' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Update the last_celebrated_level in customer_profiles
    const { error } = await adminClient
      .from('customer_profiles')
      .update({ last_celebrated_level: celebratedLevel })
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in /api/player/celebrate:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
