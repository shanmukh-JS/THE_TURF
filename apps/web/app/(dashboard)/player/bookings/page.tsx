import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { BookingListClient } from '@/components/dashboard/BookingListClient'

export const dynamic = 'force-dynamic'

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

  // Fetch bookings, joining slots, venues, areas
  const { data: rawBookings, error: bookingsError } = await supabase
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
      booking_version,
      cancellation_reason,
      cancelled_by,
      cancelled_at,
      refund_status,
      refund_amount,
      refund_reference,
      refund_completed_at,
      created_at,
      slots(date, start_time, end_time),
      venues(id, name, address, owner_id, areas(name), venue_images(url, is_cover))
    `
    )
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (bookingsError) {
    console.error('Error fetching player bookings:', bookingsError)
  }

  // Fetch reviews separately for all returned booking IDs
  const bookingIds = (rawBookings || []).map((b: any) => b.id)
  let reviewsMap = new Map<string, any>()
  if (bookingIds.length > 0) {
    try {
      const { data: reviewsData } = await supabase
        .from('booking_reviews')
        .select('booking_id, rating, feedback, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money')
        .in('booking_id', bookingIds)

      if (reviewsData) {
        reviewsData.forEach((r: any) => reviewsMap.set(r.booking_id, r))
      }
    } catch (e) {
      console.warn('Booking reviews fetch skipped:', e)
    }
  }

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

  // Fetch global admin cancellation policies
  const { data: adminSettings } = await supabase
    .from('admin_settings')
    .select('cancellation_policy')
    .limit(1)
    .maybeSingle()

  // Transform raw data into the UI shape
  const bookings = (rawBookings || []).map((b: any) => {
    // Format Date (e.g. "Jul 10, 2026")
    const rawDateStr = b.slots?.date || (b.created_at ? b.created_at.split('T')[0] : null)
    let formattedDate = 'N/A'
    if (rawDateStr) {
      const dateObj = new Date(rawDateStr + 'T00:00:00')
      formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    // Format Time (e.g. "7:00 PM - 8:00 PM")
    const formatTime = (timeStr?: string) => {
      if (!timeStr) return ''
      if (timeStr.includes(':') && !timeStr.includes('T')) {
        const [hrStr, minStr] = timeStr.split(':')
        const hr = parseInt(hrStr || '0', 10)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        const displayHr = hr % 12 || 12
        return `${displayHr}:${minStr || '00'} ${ampm}`
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
    const startTimeFormatted = formatTime(b.slots?.start_time)
    const endTimeFormatted = formatTime(b.slots?.end_time)
    const formattedTime = startTimeFormatted && endTimeFormatted ? `${startTimeFormatted} – ${endTimeFormatted}` : 'Custom Slot'

    // Automatically mark past confirmed bookings as completed
    const now = new Date()
    const isPast = b.slots?.end_time
      ? (b.slots.end_time.includes('T') ? new Date(b.slots.end_time) : new Date(`${b.slots.date}T${b.slots.end_time}`)) < now
      : false

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
              title: '🎉 Match Completed!',
              message: `Your game at ${b.venues?.name || 'Truf'} has ended. Rate your experience and earn up to +50 XP.`,
              type: 'BOOKING',
              link: '/player/bookings',
              is_read: false,
            })
          }
        })
    }

    const coverImage =
      b.venues?.venue_images?.find((img: any) => img.is_cover)?.url ||
      b.venues?.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    const rawRev = reviewsMap.get(b.id)

    return {
      id: b.id,
      venueId: b.venues?.id || '',
      venue: b.venues?.name || 'Turf Arena',
      area: b.venues?.areas?.name || b.venues?.address?.split(',')[0]?.trim() || 'Unknown',
      date: formattedDate,
      time: formattedTime,
      amount: Number(b.total_amount || 0),
      advance: Number(b.advance_paid || 0),
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
      rawStartTime: b.slots?.start_time || '',
      rawEndTime: b.slots?.end_time || '',
      rawDate: b.slots?.date || '',
      cancellationPolicy: ownerSettingsMap.get(b.venues?.owner_id) || 'flexible',
      qrCode: b.qr_code,
      checkInStatus: b.check_in_status,
      bookingVersion: b.booking_version || 1,
      cancellationReason: b.cancellation_reason,
      cancelledBy: b.cancelled_by,
      cancelledAt: b.cancelled_at,
      refundStatus: b.refund_status || 'NOT_REQUESTED',
      refundAmount: b.refund_amount ? Number(b.refund_amount) : undefined,
      refundReference: b.refund_reference,
      refundCompletedAt: b.refund_completed_at,
    }
  })

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Bookings</h1>
        <p className="text-gray-400 mt-1">All your cricket box reservations in one place.</p>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        <BookingListClient
          initialBookings={bookings}
          cancellationPolicyRules={adminSettings?.cancellation_policy}
        />
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
