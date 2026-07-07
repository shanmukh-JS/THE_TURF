import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlayerProfileClient } from '@/components/profile/PlayerProfileClient'

export const metadata = {
  title: 'My Profile | TURF GAMING',
}

export default async function CustomerProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch bookings, favorites, and customer profile
  const [{ data: bookingsData }, { data: favoritesData }, { data: profileData }] =
    await Promise.all([
      supabase
        .from('bookings')
        .select(
          `
        id,
        status,
        slots(date, start_time),
        venues(name)
      `
        )
        .eq('customer_id', user.id),
      supabase
        .from('favorites')
        .select(
          `
        venues:venue_id (name)
      `
        )
        .eq('user_id', user.id)
        .limit(1),
      supabase
        .from('customer_profiles')
        .select('profile_image_url, banner_image_url, full_name')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

  const bookings = bookingsData || []

  const favVenue: any = favoritesData?.[0]?.venues
  const firstFavName = Array.isArray(favVenue) ? favVenue[0]?.name : favVenue?.name

  const firstBookedVenue: any = bookings?.[0]?.venues
  const firstBookedName = Array.isArray(firstBookedVenue)
    ? firstBookedVenue[0]?.name
    : firstBookedVenue?.name

  const favoriteTurf = firstFavName || firstBookedName || 'None yet'

  const role = user.user_metadata?.role || 'CUSTOMER'
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <PlayerProfileClient
      user={user}
      customerProfile={profileData}
      bookings={bookings}
      favoriteTurf={favoriteTurf}
      memberSince={memberSince}
      role={role}
    />
  )
}
