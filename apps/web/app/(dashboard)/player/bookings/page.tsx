import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Resolve all potential IDs associated with this user
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

  // Fetch bookings, joining slots and venues using adminClient for reliable relations
  let rawBookings: any[] = []
  const { data: joinedData, error: joinError } = await adminClient
    .from('bookings')
    .select(
      `
      *,
      slots(id, date, start_time, end_time, price),
      venues(id, name, address, owner_id)
    `
    )
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })

  if (!joinError && joinedData) {
    rawBookings = joinedData
  } else {
    // Fallback direct query if relational join schema differs
    const { data: directData } = await adminClient
      .from('bookings')
      .select('*')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
    rawBookings = directData || []
  }

  // Collect missing slot IDs and venue IDs to fill in details reliably
  const missingSlotIds = rawBookings
    .filter((b: any) => !b.slots && b.slot_id)
    .map((b: any) => b.slot_id)
  const missingVenueIds = rawBookings
    .filter((b: any) => !b.venues && b.venue_id)
    .map((b: any) => b.venue_id)
  const allVenueIds = Array.from(
    new Set(
      rawBookings
        .map((b: any) => {
          const v = Array.isArray(b.venues) ? b.venues[0] : b.venues
          return v?.id || b.venue_id
        })
        .filter(Boolean)
    )
  )

  let slotsMap = new Map<string, any>()
  let venuesMap = new Map<string, any>()
  let venueImagesMap = new Map<string, string>()

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
        .select('id, name, address, owner_id')
        .in('id', missingVenueIds)
      venuesList?.forEach((v: any) => venuesMap.set(v.id, v))
    } catch {}
  }

  if (allVenueIds.length > 0) {
    try {
      const { data: imagesList } = await adminClient
        .from('venue_images')
        .select('venue_id, url, is_cover')
        .in('venue_id', allVenueIds)
      imagesList?.forEach((img: any) => {
        if (img.is_cover || !venueImagesMap.has(img.venue_id)) {
          venueImagesMap.set(img.venue_id, img.url)
        }
      })
    } catch {}
  }

  // Fetch reviews separately for all returned booking IDs
  const bookingIds = (rawBookings || []).map((b: any) => b.id)
  let reviewsMap = new Map<string, any>()
  if (bookingIds.length > 0) {
    try {
      const { data: reviewsData } = await adminClient
        .from('booking_reviews')
        .select(
          'booking_id, rating, feedback, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money'
        )
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
    new Set(
      (rawBookings || [])
        .map((b: any) => {
          const v = (Array.isArray(b.venues) ? b.venues[0] : b.venues) || venuesMap.get(b.venue_id)
          return v?.owner_id
        })
        .filter(Boolean)
    )
  )

  let ownerSettingsMap = new Map<string, string>()
  if (ownerIds.length > 0) {
    const { data: settingsData } = await adminClient
      .from('owner_settings')
      .select('owner_id, cancellation_policy')
      .in('owner_id', ownerIds as string[])

    if (settingsData) {
      settingsData.forEach((s: any) => ownerSettingsMap.set(s.owner_id, s.cancellation_policy))
    }
  }

  // Fetch global admin cancellation policies
  const { data: adminSettings } = await adminClient
    .from('admin_settings')
    .select('cancellation_policy')
    .limit(1)
    .maybeSingle()

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

  const now = new Date()

  // Transform raw data into the UI shape
  const bookings = (rawBookings || []).map((b: any) => {
    const slotObj = (Array.isArray(b.slots) ? b.slots[0] : b.slots) || slotsMap.get(b.slot_id)
    const venueObj = (Array.isArray(b.venues) ? b.venues[0] : b.venues) || venuesMap.get(b.venue_id)
    const venueId = venueObj?.id || b.venue_id || ''

    // Format Date (e.g. "Jul 10, 2026")
    const rawDateStr = slotObj?.date || (b.created_at ? b.created_at.split('T')[0] : null)
    let formattedDate = 'N/A'
    if (rawDateStr) {
      const dateObj = new Date(rawDateStr + 'T00:00:00')
      formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    const startTimeFormatted = formatTime(slotObj?.start_time)
    const endTimeFormatted = formatTime(slotObj?.end_time)
    const formattedTime =
      startTimeFormatted && endTimeFormatted
        ? `${startTimeFormatted} – ${endTimeFormatted}`
        : startTimeFormatted || 'Booked Slot'

    let isPast = false
    if (slotObj?.end_time) {
      if (slotObj.end_time.includes('T')) {
        isPast = new Date(slotObj.end_time).getTime() < now.getTime()
      } else if (slotObj?.date) {
        isPast = new Date(`${slotObj.date}T${slotObj.end_time}`).getTime() < now.getTime()
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
    }

    const coverImage =
      venueImagesMap.get(venueId) ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    const reviewData = reviewsMap.get(b.id)
    const venueOwnerId = venueObj?.owner_id
    const cancellationPolicy =
      (venueOwnerId && ownerSettingsMap.get(venueOwnerId)) || 'flexible'

    return {
      id: b.id,
      venueId: venueId,
      venue: venueObj?.name || 'Turf Arena',
      area: venueObj?.address?.split(',')[0]?.trim() || 'Sports Complex',
      date: formattedDate,
      time: formattedTime,
      amount: Number(b.total_amount || 0),
      advance: Number(b.advance_paid || 0),
      status: derivedStatus,
      reviewStatus: derivedReviewStatus,
      hiddenFromPlayer: !!b.hidden_from_player,
      review: reviewData
        ? {
            rating: reviewData.rating,
            feedback: reviewData.feedback,
            groundQuality: reviewData.ground_quality,
            lighting: reviewData.lighting,
            cleanliness: reviewData.cleanliness,
            staffBehaviour: reviewData.staff_behaviour,
            valueForMoney: reviewData.value_for_money,
          }
        : null,
      image: coverImage,
      rawStartTime: slotObj?.start_time || '',
      rawEndTime: slotObj?.end_time || '',
      rawDate: slotObj?.date || '',
      cancellationPolicy,
      qrCode: b.qr_code,
      checkInStatus: b.check_in_status || 'PENDING',
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
