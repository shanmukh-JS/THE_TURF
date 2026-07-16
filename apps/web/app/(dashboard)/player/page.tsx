import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlayerDashboardClient } from '@/components/dashboard/PlayerDashboardClient'

function formatTimeStr(timeStr: string | null) {
  if (!timeStr) return null
  const [hours, minutes] = timeStr.split(':')
  if (!hours) return null
  const hr = parseInt(hours, 10)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const displayHr = hr % 12 || 12
  return `${displayHr}:${minutes || '00'} ${ampm}`
}

function isOpenNow(openingTime: string | null, closingTime: string | null) {
  if (!openingTime || !closingTime) return true
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const opParts = openingTime.split(':').map(Number)
  const clParts = closingTime.split(':').map(Number)

  const opHr = opParts[0] || 0
  const opMin = opParts[1] || 0
  const clHr = clParts[0] || 0
  const clMin = clParts[1] || 0

  const openMinutes = opHr * 60 + opMin
  const closeMinutes = clHr * 60 + clMin

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
  } else {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
  }
}

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
    supabase
      .from('customer_profiles')
      .select('full_name, profile_image_url, xp, level, last_celebrated_level')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select(
        `
      id,
      total_amount,
      status,
      review_status,
      hidden_from_player,
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
      cities(name),
      venue_pricing(price),
      venue_images(url, is_cover),
      slots(status, date, start_time),
      reviews(rating),
      amenities,
      opening_time,
      closing_time
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

  // Map raw bookings to include derived statuses and persist completions
  const mappedBookings = bookings.map((b: any) => {
    const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
    const isPast = slot ? new Date(slot.end_time) < now : false
    let derivedStatus = b.status
    let derivedReviewStatus = b.review_status

    if (derivedStatus === 'CONFIRMED' && isPast) {
      derivedStatus = 'COMPLETED'
      derivedReviewStatus = 'PENDING'
      // Persist update in DB
      supabase
        .from('bookings')
        .update({ status: 'COMPLETED', review_status: 'PENDING' })
        .eq('id', b.id)
        .then(async () => {
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('title', 'Match Completed')
            .like('message', `%${b.venues?.name || 'Truf'}%`)

          if (count === 0) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Match Completed',
              message: `Your game at ${b.venues?.name || 'Truf'} has ended. Rate your experience and earn +20 XP.`,
              type: 'BOOKING',
              link: '/player/bookings',
              is_read: false,
            })
          }
        })
    }

    return {
      ...b,
      status: derivedStatus,
      review_status: derivedReviewStatus,
    }
  })

  const upcomingList = mappedBookings
    .filter((b: any) => {
      const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
      if (b.status !== 'CONFIRMED' || !slot || b.hidden_from_player) return false
      return new Date(slot.end_time) >= now
    })
    .sort((a: any, b: any) => {
      const slotA = Array.isArray(a.slots) ? a.slots[0] : a.slots
      const slotB = Array.isArray(b.slots) ? b.slots[0] : b.slots
      return new Date(slotA?.date || 0).getTime() - new Date(slotB?.date || 0).getTime()
    })

  const pastList = mappedBookings
    .filter((b: any) => {
      const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
      if (!slot || b.hidden_from_player) return false
      return new Date(slot.end_time) < now
    })
    .sort((a: any, b: any) => {
      const slotA = Array.isArray(a.slots) ? a.slots[0] : a.slots
      const slotB = Array.isArray(b.slots) ? b.slots[0] : b.slots
      return new Date(slotB?.date || 0).getTime() - new Date(slotA?.date || 0).getTime()
    })

  const upcomingBookingsCount = upcomingList.length

  const totalSpent = mappedBookings
    .filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)

  // Map cover images for venues and calculate dynamic slotsCount & rating
  const mappedVenues = (venuesData || []).map((v: any) => {
    const coverImage =
      v.venue_images?.find((img: any) => img.is_cover)?.url ||
      v.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    // Calculate live available slots count
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0] || ''
    const availableSlots = (v.slots || []).filter((s: any) => {
      if (s.status !== 'Available' || s.date < todayStr) return false
      const slotStart = new Date(s.start_time)
      return slotStart.getTime() >= now.getTime()
    })
    const slotsCount = availableSlots.length

    // Calculate rating
    const reviewsList = v.reviews || []
    const reviewsCount = reviewsList.length
    const rating =
      reviewsList.length > 0
        ? (
            reviewsList.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
            reviewsList.length
          ).toFixed(1)
        : null

    const openStr = formatTimeStr(v.opening_time)
    const closeStr = formatTimeStr(v.closing_time)
    const timings = openStr && closeStr ? `${openStr} – ${closeStr}` : '06:00 AM – 11:00 PM'
    const openStatus = isOpenNow(v.opening_time, v.closing_time)

    return {
      ...v,
      image: coverImage,
      slotsCount,
      rating,
      reviewsCount,
      timings,
      isOpen: openStatus,
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
      profileImageUrl={profile?.profile_image_url}
      email={user.email || ''}
      totalBookings={totalBookings}
      upcomingBookingsCount={upcomingBookingsCount}
      totalFavorites={totalFavorites}
      totalSpent={totalSpent}
      upcomingList={upcomingList}
      pastList={formattedPastList}
      venues={mappedVenues}
      xp={profile?.xp ?? 0}
      level={profile?.level ?? 1}
      lastCelebratedLevel={profile?.last_celebrated_level ?? 1}
    />
  )
}
