import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { BookingListClient } from '@/components/dashboard/BookingListClient'

export const metadata = {
  title: 'My Bookings | TURF GAMING',
}

export default async function CustomerBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch bookings, joining slots, venues, areas, and reviews
  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(
      `
      id,
      total_amount,
      advance_paid,
      status,
      qr_code,
      check_in_status,
      review_status,
      hidden_from_player,
      slots!inner(date, start_time, end_time),
      venues!inner(id, name, address, owner_id, areas(name), venue_images(url, is_cover)),
      booking_reviews(rating, feedback, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money)
    `
    )
    .eq('customer_id', user.id)

  // Fetch owner settings to get cancellation policies
  const ownerIds = Array.from(
    new Set((rawBookings || []).map((b: any) => b.venues?.owner_id).filter(Boolean))
  )

  let ownerSettingsMap = new Map<string, string>()
  if (ownerIds.length > 0) {
    const { data: settingsData } = await supabase
      .from('owner_settings')
      .select('owner_id, cancellation_policy')
      .in('owner_id', ownerIds as string[])

    if (settingsData) {
      settingsData.forEach((s) => ownerSettingsMap.set(s.owner_id, s.cancellation_policy))
    }
  }

  // Transform raw data into the UI shape
  const bookings = (rawBookings || []).map((b: any) => {
    // Format Date (e.g. "Jul 10, 2026")
    const dateObj = new Date(b.slots.date)
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Format Time (e.g. "7:00 PM - 8:00 PM")
    const formatTime = (timeStr: string) => {
      const t = new Date(timeStr)
      return t.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    const formattedTime = `${formatTime(b.slots.start_time)} – ${formatTime(b.slots.end_time)}`

    // Automatically mark past confirmed bookings as completed
    const now = new Date()
    const isPast = new Date(b.slots.end_time) < now
    let derivedStatus = b.status
    let derivedReviewStatus = b.review_status

    if (derivedStatus === 'CONFIRMED' && isPast) {
      derivedStatus = 'COMPLETED'
      derivedReviewStatus = 'PENDING'
      // Persist the status transition in the database asynchronously
      supabase
        .from('bookings')
        .update({ status: 'COMPLETED', review_status: 'PENDING' })
        .eq('id', b.id)
        .then()
    }

    const coverImage =
      b.venues?.venue_images?.find((img: any) => img.is_cover)?.url ||
      b.venues?.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    const rawRev = Array.isArray(b.booking_reviews) ? b.booking_reviews[0] : b.booking_reviews

    return {
      id: b.id,
      venueId: b.venues.id,
      venue: b.venues.name,
      area: b.venues.areas?.name || b.venues.address?.split(',')[0]?.trim() || 'Unknown',
      date: formattedDate,
      time: formattedTime,
      amount: b.total_amount,
      advance: b.advance_paid,
      status: derivedStatus,
      reviewStatus: derivedReviewStatus,
      hiddenFromPlayer: b.hidden_from_player,
      review: rawRev
        ? {
            rating: rawRev.rating,
            feedback: rawRev.feedback,
            groundQuality: rawRev.ground_quality,
            lighting: rawRev.lighting,
            cleanliness: rawRev.cleanliness,
            staffBehaviour: rawRev.staff_behaviour,
            valueForMoney: rawRev.value_for_money,
          }
        : null,
      image: coverImage,
      rawStartTime: b.slots.start_time,
      rawEndTime: b.slots.end_time,
      rawDate: b.slots.date,
      cancellationPolicy: ownerSettingsMap.get(b.venues?.owner_id) || 'flexible',
      qrCode: b.qr_code,
      checkInStatus: b.check_in_status,
    }
  })

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Bookings</h1>
        <p className="text-gray-400 mt-1">All your cricket box reservations in one place.</p>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        <BookingListClient initialBookings={bookings} />
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
