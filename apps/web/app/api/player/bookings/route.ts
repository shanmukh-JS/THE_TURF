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

    // Query bookings with slots and venues using adminClient to ensure no RLS joins fail
    const { data: bookingsData, error } = await adminClient
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
        venues(id, name, address, owner_id, venue_images(url, is_cover))
      `
      )
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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

    const formattedBookings = (bookingsData || []).map((b: any) => {
      const slotObj = Array.isArray(b.slots) ? b.slots[0] : b.slots
      const venueObj = Array.isArray(b.venues) ? b.venues[0] : b.venues

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
          : 'Custom Slot'

      const isPast = slotObj?.end_time
        ? (slotObj.end_time.includes('T')
            ? new Date(slotObj.end_time)
            : new Date(`${slotObj.date}T${slotObj.end_time}`)) < now
        : false

      let derivedStatus = b.status
      let derivedReviewStatus = b.review_status
      if (derivedStatus === 'CONFIRMED' && isPast) {
        derivedStatus = 'COMPLETED'
        derivedReviewStatus = 'PENDING'
      }

      const venueImages = venueObj?.venue_images || []
      const coverImage =
        venueImages.find((img: any) => img.is_cover)?.url ||
        venueImages[0]?.url ||
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

      return {
        id: b.id,
        venueId: venueObj?.id || '',
        venue: venueObj?.name || 'Turf Arena',
        area: venueObj?.address?.split(',')[0]?.trim() || 'Unknown Area',
        date: formattedDate,
        time: formattedTime,
        amount: Number(b.total_amount || 0),
        advance: Number(b.advance_paid || 0),
        status: derivedStatus,
        reviewStatus: derivedReviewStatus,
        hiddenFromPlayer: b.hidden_from_player,
        review: null,
        image: coverImage,
        rawStartTime: slotObj?.start_time || '',
        rawEndTime: slotObj?.end_time || '',
        rawDate: slotObj?.date || '',
        cancellationPolicy: 'flexible',
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

    return NextResponse.json({ bookings: formattedBookings })
  } catch (err: any) {
    console.error('GET /api/player/bookings error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch bookings' }, { status: 500 })
  }
}
