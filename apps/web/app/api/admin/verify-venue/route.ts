import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AiVerificationService } from '@/lib/services/ai/AiVerificationService'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { venueId, venueData: customVenueData } = body

    let venueToAnalyze = customVenueData

    if (!venueToAnalyze && venueId) {
      const adminClient = createAdminClient()
      const { data: v, error: vErr } = await adminClient
        .from('venues')
        .select(
          `
          *,
          city:cities(name),
          area:areas(name),
          venue_pricing(price),
          venue_images(url, is_cover),
          owner_profiles (
            id,
            full_name,
            owner_settings (
              bank_account_number,
              bank_ifsc_code,
              business_name
            )
          )
        `
        )
        .eq('id', venueId)
        .maybeSingle()

      if (vErr || !v) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
      }
      venueToAnalyze = v
    }

    if (!venueToAnalyze) {
      return NextResponse.json({ error: 'Missing venue data or ID' }, { status: 400 })
    }

    const result = await AiVerificationService.verifyVenue(venueToAnalyze)
    return NextResponse.json({ success: true, verification: result })
  } catch (err: any) {
    console.error('AI Verification API Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
