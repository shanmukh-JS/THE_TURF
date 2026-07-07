import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlayerDashboardClient } from '@/components/dashboard/PlayerDashboardClient'

export default async function PlayerDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch everything in parallel
  const [
    { data: profile },
    { data: bookingsData },
    { data: venuesData },
    { count: favoritesCount },
  ] = await Promise.all([
    supabase.from('customer_profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('bookings')
      .select(
        `
      id,
      total_amount,
      status,
      slots(date, start_time, end_time),
      venues(id, name, address, venue_pricing(price), venue_images(url, is_cover))
    `
      )
      .eq('customer_id', user.id),
    supabase
      .from('venues')
      .select(
        `
      id,
      name,
      address,
      areas(name),
      venue_pricing(price),
      venue_images(url, is_cover)
    `
      )
      .eq('verification_status', 'APPROVED')
      .eq('is_disabled', false)
      .limit(6),
    supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'
  const bookings = bookingsData || []

  // Calculations
  const totalBookings = bookings.length

  const now = new Date()
  const upcomingList = bookings
    .filter((b: any) => {
      if (b.status !== 'CONFIRMED' || !b.slots) return false
      const slotDate = new Date(b.slots.date)
      // Strip time for clean date comparison
      slotDate.setHours(23, 59, 59, 999)
      return slotDate >= now
    })
    .sort((a: any, b: any) => new Date(a.slots.date).getTime() - new Date(b.slots.date).getTime())

  const pastList = bookings
    .filter((b: any) => {
      if (!b.slots) return false
      const slotDate = new Date(b.slots.date)
      slotDate.setHours(23, 59, 59, 999)
      return slotDate < now
    })
    .sort((a: any, b: any) => new Date(b.slots.date).getTime() - new Date(a.slots.date).getTime())

  const upcomingBookingsCount = upcomingList.length

  const totalSpent = bookings
    .filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)

  // Map cover images for venues
  const mappedVenues = (venuesData || []).map((v: any) => {
    const coverImage =
      v.venue_images?.find((img: any) => img.is_cover)?.url ||
      v.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'
    return {
      ...v,
      image: coverImage,
    }
  })

  // Format past bookings with cover images too
  const formattedPastList = pastList.map((b: any) => {
    const coverImage =
      b.venues?.venue_images?.find((img: any) => img.is_cover)?.url ||
      b.venues?.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'
    return {
      ...b,
      venues: {
        ...b.venues,
        image: coverImage,
      },
    }
  })

  const totalFavorites = favoritesCount || 0

  return (
    <PlayerDashboardClient
      displayName={displayName}
      email={user.email || ''}
      totalBookings={totalBookings}
      upcomingBookingsCount={upcomingBookingsCount}
      totalFavorites={totalFavorites}
      totalSpent={totalSpent}
      upcomingList={upcomingList}
      pastList={formattedPastList}
      venues={mappedVenues}
    />
  )
}
