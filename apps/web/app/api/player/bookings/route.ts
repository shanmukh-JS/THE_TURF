import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve all possible IDs associated with this user
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

    // Query bookings directly with adminClient
    let bookingsData: any[] = []
    
    // Try with joins first
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
      bookingsData = joinedData
    } else {
      // Fallback: simple direct query if relational join schema differs
      const { data: directData } = await adminClient
        .from('bookings')
        .select('*')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })
      bookingsData = directData || []
    }

    // Collect missing slot IDs and venue IDs to fill in details reliably
    const missingSlotIds = bookingsData
      .filter((b: any) => !b.slots && b.slot_id)
      .map((b: any) => b.slot_id)
    const missingVenueIds = bookingsData
      .filter((b: any) => !b.venues && b.venue_id)
      .map((b: any) => b.venue_id)
    const allVenueIds = Array.from(
      new Set(
        bookingsData
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

    const formattedBookings = bookingsData.map((b: any) => {
      const slotObj = (Array.isArray(b.slots) ? b.slots[0] : b.slots) || slotsMap.get(b.slot_id)
      const venueObj = (Array.isArray(b.venues) ? b.venues[0] : b.venues) || venuesMap.get(b.venue_id)
      const venueId = venueObj?.id || b.venue_id || ''

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
        review: null,
        image: coverImage,
        rawStartTime: slotObj?.start_time || '',
        rawEndTime: slotObj?.end_time || '',
        rawDate: slotObj?.date || '',
        cancellationPolicy: 'flexible',
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

    return NextResponse.json({ bookings: formattedBookings })
  } catch (error: any) {
    console.error('Error fetching player bookings:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
