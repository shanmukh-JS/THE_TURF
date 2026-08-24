import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { fullName, profileImageUrl, bannerImageUrl } = body

    const adminSupabase = createAdminClient()

    // 1. Ensure the user exists in public.users to satisfy foreign key constraint
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existingUser) {
      await adminSupabase.from('users').upsert(
        {
          id: user.id,
          email: user.email || '',
          phone: user.phone || '',
          role: user.user_metadata?.role || 'CUSTOMER',
        },
        { onConflict: 'id' }
      )
    }

    // 2. Fetch existing customer_profiles record if any
    const { data: existingProfile } = await adminSupabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const updatedFullName =
      fullName !== undefined && fullName.trim() !== ''
        ? fullName.trim()
        : existingProfile?.full_name || user.user_metadata?.full_name || 'Player'
    const updatedProfileImage =
      profileImageUrl !== undefined ? profileImageUrl : existingProfile?.profile_image_url || null
    const updatedBannerImage =
      bannerImageUrl !== undefined ? bannerImageUrl : existingProfile?.banner_image_url || null

    // 3. Upsert into customer_profiles safely
    const { error: profileError } = await adminSupabase.from('customer_profiles').upsert(
      {
        user_id: user.id,
        full_name: updatedFullName,
        profile_image_url: updatedProfileImage,
        banner_image_url: updatedBannerImage,
      },
      { onConflict: 'user_id' }
    )

    if (profileError) {
      console.error('Error upserting customer_profiles:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 4. Update auth user metadata via admin client to ensure persistence across all sessions
    try {
      await adminSupabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          full_name: updatedFullName,
          avatar_url: updatedProfileImage,
        },
      })
    } catch (metaErr) {
      console.warn('Failed to update auth user metadata via admin:', metaErr)
    }

    // 5. Also update user session metadata if available
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updatedFullName,
          avatar_url: updatedProfileImage,
        },
      })
    } catch {
      // Non-blocking fallback
    }

    return NextResponse.json({
      success: true,
      profile: {
        fullName: updatedFullName,
        profileImageUrl: updatedProfileImage,
        bannerImageUrl: updatedBannerImage,
      },
    })
  } catch (err: any) {
    console.error('Profile update route error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
