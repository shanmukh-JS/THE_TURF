import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabaseAdmin
      .from('owner_profiles')
      .select('user_id, full_name, business_name')
      .eq('id', ownerId)
      .maybeSingle()

    const { data: settings } = await supabaseAdmin
      .from('owner_settings')
      .select('business_logo_url, business_email, business_phone, booking_buffer_time')
      .eq('owner_id', ownerId)
      .maybeSingle()

    return NextResponse.json({ profile, settings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
