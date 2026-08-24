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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const target = formData.get('target') as 'profile' | 'banner' | null

    if (!file || !target) {
      return NextResponse.json({ error: 'File and target type are required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Ensure bucket 'player_profiles' exists
    const bucketName = 'player_profiles'
    const { data: buckets } = await adminSupabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === bucketName)
    if (!bucketExists) {
      await adminSupabase.storage.createBucket(bucketName, { public: true })
    }

    // 2. Convert File to ArrayBuffer/Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = `${user.id}/${target}_${Date.now()}.${fileExt}`

    // 3. Upload file using admin client
    const { error: uploadError } = await adminSupabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = adminSupabase.storage.from(bucketName).getPublicUrl(filePath)
    const uploadedUrl = publicUrlData.publicUrl

    // 4. Ensure user exists in public.users
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

    // 5. Get current profile to preserve existing fields
    const { data: currentProfile } = await adminSupabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const updatePayload: any = {
      user_id: user.id,
      full_name: currentProfile?.full_name || user.user_metadata?.full_name || 'Player',
      updated_at: new Date().toISOString(),
    }

    if (target === 'profile') {
      updatePayload.profile_image_url = uploadedUrl
      updatePayload.banner_image_url = currentProfile?.banner_image_url || null
    } else {
      updatePayload.profile_image_url = currentProfile?.profile_image_url || null
      updatePayload.banner_image_url = uploadedUrl
    }

    const { error: profileError } = await adminSupabase
      .from('customer_profiles')
      .upsert(updatePayload, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Customer profile upsert error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 6. Synchronize auth metadata using admin API
    if (target === 'profile') {
      try {
        await adminSupabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: uploadedUrl,
          },
        })
      } catch (authErr) {
        console.warn('Auth admin update error:', authErr)
      }
    }

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      target,
    })
  } catch (err: any) {
    console.error('Profile image upload error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
