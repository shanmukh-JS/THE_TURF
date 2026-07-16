import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SentimentService } from '@/lib/services/ai/SentimentService'
import { XpService } from '@/lib/services/xpService'
import { XP } from '@/config/settings'
import { z } from 'zod'

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  groundQuality: z.number().min(1).max(5).optional(),
  lighting: z.number().min(1).max(5).optional(),
  staffBehaviour: z.number().min(1).max(5).optional(),
  cleanliness: z.number().min(1).max(5).optional(),
  valueForMoney: z.number().min(1).max(5).optional(),
  feedback: z.string().min(10).max(500),
  reviewTime: z.number().int().nonnegative().optional().default(0),
  deviceType: z.string().optional().default('desktop'),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error?.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const {
      bookingId,
      rating,
      groundQuality,
      lighting,
      staffBehaviour,
      cleanliness,
      valueForMoney,
      feedback,
      reviewTime,
      deviceType,
    } = parsed.data

    const supabase = createAdminClient()

    // 1. Fetch booking details
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, customer_id, venue_id, status, payment_status, slots(end_time, start_time, date), venues(name, owner_id)'
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    // Eligibility check
    const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const isPast = slot ? new Date(slot.end_time) < new Date() : false
    const isEligibleStatus =
      booking.status === 'COMPLETED' || (booking.status === 'CONFIRMED' && isPast)

    if (!isEligibleStatus) {
      return NextResponse.json(
        { error: 'Booking is not eligible for review. Match has not ended yet.' },
        { status: 403 }
      )
    }

    // 2. Check if a review already exists
    const { data: existingReview, error: fetchErr } = await supabase
      .from('booking_reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle()

    const isEdit = !!existingReview

    if (isEdit && existingReview) {
      // Check 30-minute editing window
      const submissionTime = new Date(existingReview.created_at).getTime()
      const nowTime = Date.now()
      const diffMinutes = (nowTime - submissionTime) / (1000 * 60)

      if (diffMinutes > 30) {
        return NextResponse.json(
          { error: 'Review editing window (30 minutes) has expired.' },
          { status: 403 }
        )
      }
    }

    // Calculate booking duration in minutes if possible
    let bookingDuration = 60
    if (slot && slot.date && slot.start_time && slot.end_time) {
      const start = new Date(`${slot.date}T${slot.start_time}`).getTime()
      const end = new Date(`${slot.date}T${slot.end_time}`).getTime()
      const calculated = Math.round((end - start) / 60000)
      if (!isNaN(calculated) && calculated > 0) {
        bookingDuration = calculated
      }
    }

    // Perform AI sentiment analysis
    const { sentiment, breakdown, aiSummary } = SentimentService.analyzeReview(feedback)

    let xpAwarded = 0
    let levelAfter = 1
    const xpService = new XpService()

    if (!isEdit) {
      // Create new review
      const { error: insertErr } = await supabase.from('booking_reviews').insert({
        booking_id: bookingId,
        player_id: booking.customer_id,
        turf_id: booking.venue_id,
        rating,
        feedback,
        review_source: 'player',
        review_time: reviewTime,
        booking_duration: bookingDuration,
        review_sentiment: sentiment,
        device_type: deviceType,
        ground_quality: groundQuality || null,
        lighting: lighting || null,
        cleanliness: cleanliness || null,
        staff_behaviour: staffBehaviour || null,
        value_for_money: valueForMoney || null,
      })

      if (insertErr) {
        console.error('booking_reviews insert error:', insertErr)
        return NextResponse.json(
          { error: insertErr.message || 'Failed to save review.' },
          { status: 500 }
        )
      }

      // Sync with public.reviews table (non-blocking)
      try {
        await supabase.from('reviews').insert({
          venue_id: booking.venue_id,
          customer_id: booking.customer_id,
          rating,
          comment: feedback,
        })
      } catch (e: any) {
        console.error('Reviews sync error:', e.message)
      }

      // Sync with legacy venue_ratings table (non-blocking)
      try {
        await supabase.from('venue_ratings').insert({
          booking_id: bookingId,
          user_id: booking.customer_id,
          overall_rating: rating,
          ground_quality: groundQuality || rating,
          lighting: lighting || rating,
          staff_behaviour: staffBehaviour || rating,
          cleanliness: cleanliness || rating,
          value_for_money: valueForMoney || rating,
          comments: feedback,
          sentiment,
          sentiment_breakdown: breakdown,
          ai_summary: aiSummary,
          moderation_status: 'APPROVED',
        })
      } catch (e: any) {
        console.error('Venue ratings sync error:', e.message)
      }

      // Set booking status to COMPLETED and review_status to SUBMITTED
      await supabase
        .from('bookings')
        .update({ status: 'COMPLETED', review_status: 'SUBMITTED' })
        .eq('id', bookingId)

      // Calculate XP rewards dynamically:
      // First review gets +50 XP (firstReviewAward), subsequent get +20 XP (reviewAward)
      const { count: reviewCount } = await supabase
        .from('booking_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', booking.customer_id)

      const isFirst = (reviewCount || 0) <= 1 // Including this newly inserted review
      const firstAward = (XP as any).firstReviewAward ?? 50
      const standardAward = (XP as any).reviewAward ?? 20
      xpAwarded = isFirst ? firstAward : standardAward

      // Award XP using XpService style updates
      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('xp, level')
        .eq('user_id', booking.customer_id)
        .single()

      if (profile) {
        const xpBefore = profile.xp ?? 0
        const xpAfter = xpBefore + xpAwarded
        levelAfter = xpService.calculateLevel(xpAfter)

        await supabase
          .from('customer_profiles')
          .update({
            xp: xpAfter,
            level: levelAfter,
          })
          .eq('user_id', booking.customer_id)

        // Write progression log (non-blocking)
        try {
          await supabase.from('xp_audit_logs').insert({
            user_id: booking.customer_id,
            booking_id: bookingId,
            action: 'BOOKED',
            xp_before: xpBefore,
            xp_change: xpAwarded,
            xp_after: xpAfter,
            level_before: profile.level ?? 1,
            level_after: levelAfter,
          })
        } catch (e: any) {
          console.error('XP audit log error:', e.message)
        }
      }

      // Notify Turf Owner via in-app notification + logs (non-blocking)
      const venue = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues
      const ownerId = venue?.owner_id
      try {
        // Insert in-app notification for the owner
        if (ownerId) {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            title: `⭐ New ${rating}-Star Review!`,
            message: `A player rated your turf "${venue?.name || 'Truf'}" ${rating}/5 stars. "${feedback.substring(0, 80)}${feedback.length > 80 ? '...' : ''}"`,
            type: 'BOOKING',
            link: '/owner/reviews',
            is_read: false,
          })
        }
      } catch (e: any) {
        console.error('Owner notification error:', e.message)
      }
      try {
        await supabase.from('notification_logs').insert({
          action: 'NEW_REVIEW_RECEIVED',
          error_stack: `New ${rating}-star review received for ${venue?.name || 'Truf'}. Feedback: "${feedback}"`,
          request_payload: { bookingId, rating, feedback },
        })
      } catch (e: any) {
        console.error('Notification log error:', e.message)
      }
    } else if (existingReview) {
      // Update existing review (EDIT window is open)
      const { error: updateErr } = await supabase
        .from('booking_reviews')
        .update({
          rating,
          feedback,
          review_sentiment: sentiment,
          review_time: reviewTime,
          edited: true,
          edited_at: new Date().toISOString(),
          ground_quality: groundQuality || null,
          lighting: lighting || null,
          cleanliness: cleanliness || null,
          staff_behaviour: staffBehaviour || null,
          value_for_money: valueForMoney || null,
        })
        .eq('booking_id', bookingId)

      if (updateErr) {
        console.error('booking_reviews update error:', updateErr)
        return NextResponse.json(
          { error: updateErr.message || 'Failed to update review.' },
          { status: 500 }
        )
      }

      // Update legacy reviews (match by customer and venue and update rating/comment)
      await supabase
        .from('reviews')
        .update({
          rating,
          comment: feedback,
        })
        .eq('venue_id', booking.venue_id)
        .eq('customer_id', booking.customer_id)

      // Update legacy venue_ratings
      await supabase
        .from('venue_ratings')
        .update({
          overall_rating: rating,
          ground_quality: groundQuality || rating,
          lighting: lighting || rating,
          staff_behaviour: staffBehaviour || rating,
          cleanliness: cleanliness || rating,
          value_for_money: valueForMoney || rating,
          comments: feedback,
          sentiment,
          sentiment_breakdown: breakdown,
          ai_summary: aiSummary,
        })
        .eq('booking_id', bookingId)

      const { data: profile } = await supabase
        .from('customer_profiles')
        .select('level')
        .eq('user_id', booking.customer_id)
        .single()
      levelAfter = profile?.level ?? 1
    }

    return NextResponse.json({
      success: true,
      isEdit,
      xpAwarded,
      level: levelAfter,
      message: isEdit ? 'Review updated successfully!' : `Thank you! +${xpAwarded} XP awarded!`,
    })
  } catch (err: any) {
    console.error('Submit review error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
