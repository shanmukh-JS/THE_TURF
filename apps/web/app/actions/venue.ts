'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitVenueAction(formData: FormData) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to list a venue.' }
    }

    // 2. Get Owner Profile ID
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerProfile) {
      return { success: false, error: 'Owner profile not found. Are you registered as an owner?' }
    }

    // 3. Upload Images to Supabase Storage
    const coverFile = formData.get('coverImage') as File | null
    const groundFile = formData.get('groundImage') as File | null
    const facilityFile = formData.get('facilityImage') as File | null

    const uploadedImages: { url: string; is_cover: boolean }[] = []

    const uploadFile = async (file: File | null, isCover: boolean) => {
      if (!file || file.size === 0) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${ownerProfile.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `venues/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('venue_images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload Error:', uploadError)
        throw new Error('Failed to upload image')
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('venue_images').getPublicUrl(filePath)

      uploadedImages.push({ url: publicUrl, is_cover: isCover })
    }

    await uploadFile(coverFile, true)
    await uploadFile(groundFile, false)
    await uploadFile(facilityFile, false)

    // 4. Insert Venue Record
    const facilitiesJson = formData.get('facilities') as string
    const facilities = facilitiesJson ? JSON.parse(facilitiesJson) : []

    const sportsStr = formData.get('sports') as string
    const sportsAvailable = sportsStr ? sportsStr.split(',').map((s) => s.trim()) : []

    const venueData = {
      owner_id: ownerProfile.id,
      name: formData.get('venueName') as string,
      description: formData.get('description') as string,
      address: formData.get('address') as string,
      city_name: formData.get('city') as string,
      contact_email: formData.get('emailAddress') as string,
      contact_phone: formData.get('mobileNumber') as string,
      google_maps_link: formData.get('mapLocation') as string,
      sports_available: sportsAvailable,
      pitches: parseInt(formData.get('courts') as string) || 1,
      facilities: facilities,
      verification_status: 'PENDING',
    }

    const { data: newVenue, error: venueError } = await supabase
      .from('venues')
      .insert(venueData)
      .select('id')
      .single()

    if (venueError) {
      console.error('Venue Insert Error:', venueError)
      return { success: false, error: 'Failed to create venue record.' }
    }

    // 5. Insert Pricing
    const pricePerHour = parseFloat(formData.get('pricePerHour') as string)
    if (pricePerHour) {
      const { error: priceError } = await supabase.from('venue_pricing').insert({
        venue_id: newVenue.id,
        price: pricePerHour,
      })
      if (priceError) console.error('Price Insert Error:', priceError)
    }

    // 6. Insert Image Records
    if (uploadedImages.length > 0) {
      const imageRecords = uploadedImages.map((img) => ({
        venue_id: newVenue.id,
        url: img.url,
        is_cover: img.is_cover,
      }))

      const { error: imageError } = await supabase.from('venue_images').insert(imageRecords)

      if (imageError) console.error('Image Insert Error:', imageError)
    }

    revalidatePath('/owner')
    return { success: true, venueId: newVenue.id }
  } catch (error: any) {
    console.error('Submission error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}
