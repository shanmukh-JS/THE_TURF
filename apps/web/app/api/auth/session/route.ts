import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ user: null })
    }

    // Fetch owner profile for logo if OWNER role
    let logoUrl: string | undefined
    if (user.user_metadata?.role === 'OWNER') {
      try {
        const { data: profile } = await supabase
          .from('owner_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (profile) {
          const { data: settings } = await supabase
            .from('owner_settings')
            .select('business_logo_url')
            .eq('owner_id', profile.id)
            .maybeSingle()

          logoUrl = settings?.business_logo_url || undefined
        }
      } catch {
        // logo fetch is non-critical, ignore errors
      }
    } else {
      // For CUSTOMER or ADMIN, try to fetch from customer_profiles
      try {
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('profile_image_url')
          .eq('user_id', user.id)
          .maybeSingle()

        logoUrl = profile?.profile_image_url || undefined
      } catch {
        // ignore errors
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || 'CUSTOMER',
        fullName: user.user_metadata?.full_name,
        logoUrl,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
