import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PlayerDashboardClient } from '@/components/dashboard/PlayerDashboardClient'
import { calculateBookingStreak } from '@/lib/utils/streak'
import { getLocalDateString } from '@/lib/utils'

function formatTimeStr(timeStr: string | null) {
  if (!timeStr) return null
  if (timeStr.includes(':') && !timeStr.includes('T')) {
    const [hours, minutes] = timeStr.split(':')
    if (!hours) return null
    const hr = parseInt(hours, 10)
    const ampm = hr >= 12 ? 'PM' : 'AM'
    const displayHr = hr % 12 || 12
    return `${displayHr}:${minutes || '00'} ${ampm}`
  }
  const t = new Date(timeStr)
  return isNaN(t.getTime())
    ? timeStr
    : t.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
      })
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
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Resolve user IDs
  const customerIds = [user.id]
  try {
    const { data: customerProfile } = await adminClient
      .from('customer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (customerProfile?.id && !customerIds.includes(customerProfile.id)) {
      customerIds.push(customerProfile.id)
    }
  } catch {}

  // Fetch everything in parallel
  const [
    { data: profile },
    { data: joinedBookings, error: bookingsError },
    { data: venuesData },
    { data: rawFavorites },
  ] = await Promise.all([
    supabase
      .from('customer_profiles')
      .select('full_name, profile_image_url, xp, level, last_celebrated_level')
      .eq('user_id', user.id)
      .maybeSingle(),
    adminClient
      .from('bookings')
      .select(
        `
        *,
        slots(id, date, start_time, end_time, price),
        venues(id, name, address, venue_pricing(price), venue_images(url, is_cover))
      `
      )
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false }),
    adminClient
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
      closing_time,
      is_disabled,
      verification_status,
      owner_profiles(
        user_id,
        users(is_suspended)
      )
    `
      )
      .eq('verification_status', 'APPROVED')
      .eq('is_disabled', false)
      .limit(10),
    supabase.from('favorites').select('venue_id').eq('user_id', user.id),
  ])

  let rawBookings = joinedBookings || []
  if (bookingsError || !joinedBookings) {
    const { data: fallbackBookings } = await adminClient
      .from('bookings')
      .select('*')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
    rawBookings = fallbackBookings || []
  }

  // Missing slots/venues lookup for robust rendering
  const missingSlotIds = rawBookings.filter((b: any) => !b.slots && b.slot_id).map((b: any) => b.slot_id)
  const missingVenueIds = rawBookings.filter((b: any) => !b.venues && b.venue_id).map((b: any) => b.venue_id)

  let slotsMap = new Map<string, any>()
  let venuesMap = new Map<string, any>()

  if (missingSlotIds.length > 0) {
    try {
      const { data: slotsList } = await adminClient
        .from('slots')
        .select('id, date, start_time, end_time, price')
        .in('id', missingSlotIds)
      slotsList?.forEach((s: any) => slotsMap.set(s.id, s))
    } catch {}
  }

  if (missingVenueIds.length > 0) {
    try {
      const { data: venuesList } = await adminClient
        .from('venues')
        .select('id, name, address')
        .in('id', missingVenueIds)
      venuesList?.forEach((v: any) => venuesMap.set(v.id, v))
    } catch {}
  }

  // Filter out any venue whose owner is currently suspended or venue is disabled/unapproved
  const filteredVenues = (venuesData || []).filter((v: any) => {
    const rawUsers = (v.owner_profiles as any)?.users
    const isOwnerSuspended =
      rawUsers?.is_suspended === true ||
      (Array.isArray(rawUsers) && rawUsers[0]?.is_suspended === true)
    return (
      !isOwnerSuspended &&
      !v.is_disabled &&
      v.verification_status === 'APPROVED'
    )
  })

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'
  const bookings = rawBookings

  // Calculations
  const totalBookings = bookings.length
  const now = new Date()

  // Map raw bookings to include derived statuses and persist completions
  const mappedBookings = bookings.map((b: any) => {
    const slot = (Array.isArray(b.slots) ? b.slots[0] : b.slots) || slotsMap.get(b.slot_id)
    const venue = (Array.isArray(b.venues) ? b.venues[0] : b.venues) || venuesMap.get(b.venue_id)

    let isPast = false
    if (slot?.end_time) {
      if (slot.end_time.includes('T')) {
        isPast = new Date(slot.end_time).getTime() < now.getTime()
      } else if (slot.date) {
        isPast = new Date(`${slot.date}T${slot.end_time}`).getTime() < now.getTime()
      }
    }

    const rawStatus = (b.status || 'CONFIRMED').toUpperCase()
    let derivedStatus = rawStatus
    let derivedReviewStatus = b.review_status || 'PENDING'

    if (
      (derivedStatus === 'CONFIRMED' || derivedStatus === 'BOOKED' || derivedStatus === 'PAID') &&
      isPast
    ) {
      derivedStatus = 'COMPLETED'
      derivedReviewStatus = 'PENDING'
    }

    return {
      ...b,
      slots: slot,
      venues: venue,
      status: derivedStatus,
      review_status: derivedReviewStatus,
    }
  })

  const upcomingList = mappedBookings
    .filter((b: any) => {
      const slot = b.slots
      const st = (b.status || '').toUpperCase()
      if ((st !== 'CONFIRMED' && st !== 'PENDING' && st !== 'BOOKED') || b.hidden_from_player) return false
      if (!slot) return true
      let isPast = false
      if (slot.end_time) {
        if (slot.end_time.includes('T')) {
          isPast = new Date(slot.end_time).getTime() < now.getTime()
        } else if (slot.date) {
          isPast = new Date(`${slot.date}T${slot.end_time}`).getTime() < now.getTime()
        }
      }
      return !isPast
    })
    .sort((a: any, b: any) => {
      const slotA = a.slots
      const slotB = b.slots
      return new Date(slotA?.date || a.created_at || 0).getTime() - new Date(slotB?.date || b.created_at || 0).getTime()
    })

  const pastList = mappedBookings
    .filter((b: any) => {
      const slot = b.slots
      const st = (b.status || '').toUpperCase()
      if (st === 'CANCELLED' || b.hidden_from_player) return false
      if (st === 'COMPLETED') return true
      if (!slot) return false
      let isPast = false
      if (slot.end_time) {
        if (slot.end_time.includes('T')) {
          isPast = new Date(slot.end_time).getTime() < now.getTime()
        } else if (slot.date) {
          isPast = new Date(`${slot.date}T${slot.end_time}`).getTime() < now.getTime()
        }
      }
      return isPast
    })
    .sort((a: any, b: any) => {
      const slotA = a.slots
      const slotB = b.slots
      return new Date(slotB?.date || b.created_at || 0).getTime() - new Date(slotA?.date || a.created_at || 0).getTime()
    })

  const upcomingBookingsCount = upcomingList.length

  const totalSpent = mappedBookings
    .filter((b: any) => {
      const st = (b.status || '').toUpperCase()
      return st === 'CONFIRMED' || st === 'COMPLETED' || st === 'BOOKED' || st === 'PAID'
    })
    .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0)

  // Map cover images for venues and calculate dynamic slotsCount & rating
  const mappedVenues = filteredVenues.map((v: any) => {
    const coverImage =
      v.venue_images?.find((img: any) => img.is_cover)?.url ||
      v.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    // Calculate live available slots count
    const todayStr = getLocalDateString()
    const availableSlots = (v.slots || []).filter((s: any) => {
      if (s.status !== 'Available') return false
      if (s.date < todayStr) return false
      if (s.date === todayStr) {
        const slotStart = s.start_time?.includes('T')
          ? new Date(s.start_time)
          : new Date(`${s.date}T${s.start_time}`)
        return slotStart.getTime() >= now.getTime()
      }
      return true
    })

    const reviews = v.reviews || []
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
        : 0

    const pricingObj = Array.isArray(v.venue_pricing) ? v.venue_pricing[0] : v.venue_pricing
    const slotPrice = v.slots?.[0]?.price
    const calculatedPrice = Number(pricingObj?.price ?? slotPrice ?? 0)

    return {
      id: v.id,
      name: v.name,
      address: v.address,
      area: v.areas?.name || 'Local Area',
      city: v.cities?.name || 'City',
      price: calculatedPrice,
      venue_pricing: v.venue_pricing,
      image: coverImage,
      slotsCount: availableSlots.length,
      rating: Number(avgRating.toFixed(1)),
      reviewCount: reviews.length,
      amenities: Array.isArray(v.amenities) ? v.amenities : [],
      openingTime: formatTimeStr(v.opening_time),
      closingTime: formatTimeStr(v.closing_time),
      isOpen: isOpenNow(v.opening_time, v.closing_time),
    }
  })

  // Next upcoming booking detail
  const nextBooking = upcomingList[0] || null
  let nextBookingDetails = null
  if (nextBooking) {
    const slot = nextBooking.slots
    const venue = nextBooking.venues
    const venueImg =
      venue?.venue_images?.find((img: any) => img.is_cover)?.url ||
      venue?.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    const startTimeFormatted = formatTimeStr(slot?.start_time)
    const endTimeFormatted = formatTimeStr(slot?.end_time)
    const formattedTime =
      startTimeFormatted && endTimeFormatted
        ? `${startTimeFormatted} – ${endTimeFormatted}`
        : startTimeFormatted || 'Reserved Slot'

    let formattedDate = 'Upcoming'
    if (slot?.date) {
      const dateObj = new Date(slot.date + 'T00:00:00')
      formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    nextBookingDetails = {
      id: nextBooking.id,
      venueName: venue?.name || 'Turf Arena',
      address: venue?.address || 'Sports Complex',
      date: formattedDate,
      time: formattedTime,
      rawStartTime: slot?.start_time || '',
      rawDate: slot?.date || '',
      price: nextBooking.total_amount,
      advancePaid: nextBooking.advance_paid,
      status: nextBooking.status,
      image: venueImg,
    }
  }

  // Favorite venues
  const favoriteVenueIds = (rawFavorites || []).map((f: any) => f.venue_id)
  const favorites = mappedVenues.filter((v: any) => favoriteVenueIds.includes(v.id))

  // Calculate booking streak from mappedBookings
  const streak = calculateBookingStreak(mappedBookings)

  // Build unified Recent Activity Timeline
  const recentActivityList = mappedBookings
    .slice(0, 10)
    .map((b: any) => {
      const slot = b.slots
      const venue = b.venues
      const venueName = venue?.name || 'Turf Arena'
      const st = (b.status || 'CONFIRMED').toUpperCase()

      let timeFormatted = 'Reserved Slot'
      if (slot?.start_time && slot?.end_time) {
        const sTime = formatTimeStr(slot.start_time)
        const eTime = formatTimeStr(slot.end_time)
        if (sTime && eTime) timeFormatted = `${sTime} – ${eTime}`
      }

      let dateFormatted = 'Recent'
      const rawDateStr = slot?.date || (b.created_at ? b.created_at.split('T')[0] : null)
      if (rawDateStr) {
        const d = new Date(rawDateStr + 'T00:00:00')
        dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }

      let type: 'BOOKING_CREATED' | 'MATCH_PLAYED' | 'BOOKING_CANCELLED' = 'BOOKING_CREATED'
      let title = `Booked slot at ${venueName}`
      let description = `${dateFormatted} • ${timeFormatted} • ₹${b.total_amount || 0}`
      let statusColor = 'text-green-400'

      if (st === 'COMPLETED') {
        type = 'MATCH_PLAYED'
        title = `Match played at ${venueName}`
        description = `${dateFormatted} • Completed • ₹${b.total_amount || 0}`
        statusColor = 'text-blue-400'
      } else if (st === 'CANCELLED') {
        type = 'BOOKING_CANCELLED'
        title = `Cancelled reservation at ${venueName}`
        description = `${dateFormatted} • Cancelled • Refund: ₹${b.refund_amount || 0}`
        statusColor = 'text-red-400'
      }

      return {
        id: b.id,
        type,
        title,
        description,
        timestamp: b.created_at || new Date().toISOString(),
        statusColor,
      }
    })

  return (
    <PlayerDashboardClient
      displayName={displayName}
      profileImageUrl={profile?.profile_image_url || undefined}
      email={user.email || ''}
      totalBookings={totalBookings}
      upcomingBookingsCount={upcomingBookingsCount}
      totalFavorites={favorites.length}
      bookingStreak={streak}
      totalSpent={totalSpent}
      upcomingList={upcomingList}
      pastList={pastList}
      recentActivityList={recentActivityList}
      venues={mappedVenues}
      xp={profile?.xp || 0}
      level={profile?.level || 1}
      lastCelebratedLevel={profile?.last_celebrated_level || 1}
    />
  )
}
