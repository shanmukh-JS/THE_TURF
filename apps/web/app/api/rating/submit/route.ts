import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SentimentService } from '@/lib/services/ai/SentimentService'
import { z } from 'zod'

const ratingSchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().uuid(),
  overallRating: z.number().min(1).max(5),
  groundQuality: z.number().min(1).max(5),
  lighting: z.number().min(1).max(5),
  staffBehaviour: z.number().min(1).max(5),
  cleanliness: z.number().min(1).max(5),
  valueForMoney: z.number().min(1).max(5),
  comments: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ratingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error?.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const {
      bookingId,
      token,
      overallRating,
      groundQuality,
      lighting,
      staffBehaviour,
      cleanliness,
      valueForMoney,
      comments,
    } = parsed.data

    const supabase = createAdminClient()

    // 1. Verify Secure Token
    const { data: ratingToken, error: tokenError } = await supabase
      .from('rating_tokens')
      .select('expires_at, used')
      .eq('token', token)
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (tokenError || !ratingToken) {
      return NextResponse.json({ error: 'Invalid rating token.' }, { status: 404 })
    }

    if (ratingToken.used) {
      return NextResponse.json(
        { error: 'This token has already been used. Double reviews are not permitted.' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (new Date(ratingToken.expires_at) < now) {
      return NextResponse.json({ error: 'This token has expired.' }, { status: 400 })
    }

    // 2. Query booking to extract user
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, venue_id, venues(name)')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    // 3. Process AI Sentiment / Topic Breakdown
    const reviewText = comments || ''
    const { sentiment, breakdown, aiSummary } = SentimentService.analyzeReview(reviewText)

    // Check profanity (Simple blocklist moderation)
    const blockList = ['fraud', 'scam', 'abuse', 'cheat', 'fake']
    const hasViolation = blockList.some((w) => reviewText.toLowerCase().includes(w))
    const moderationStatus = hasViolation ? 'FLAGGED' : 'APPROVED'

    // 4. Save review
    const { error: reviewError } = await supabase.from('venue_ratings').insert({
      booking_id: bookingId,
      user_id: booking.customer_id,
      overall_rating: overallRating,
      ground_quality: groundQuality,
      lighting: lighting,
      staff_behaviour: staffBehaviour,
      cleanliness: cleanliness,
      value_for_money: valueForMoney,
      comments: reviewText,
      sentiment,
      sentiment_breakdown: breakdown,
      ai_summary: aiSummary,
      moderation_status: moderationStatus,
      flagged_reason: hasViolation ? 'Profanity/Abuse word flagged' : null,
    })

    if (reviewError) throw reviewError

    // Sync to public.reviews table so rating aggregates are updated across all Turf list views
    const { error: reviewsSyncError } = await supabase.from('reviews').insert({
      venue_id: booking.venue_id,
      customer_id: booking.customer_id,
      rating: overallRating,
      comment: reviewText || null,
    })
    if (reviewsSyncError) {
      console.error('Failed to sync review to public.reviews table:', reviewsSyncError)
    }

    // 5. Update Rating Token to used
    await supabase.from('rating_tokens').update({ used: true }).eq('token', token)

    // 6. Award Loyalty Points: +20 XP, +10 Coins
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('xp, coins')
      .eq('user_id', booking.customer_id)
      .single()

    if (customerProfile) {
      await supabase
        .from('customer_profiles')
        .update({
          xp: customerProfile.xp + 20,
          coins: customerProfile.coins + 10,
        })
        .eq('user_id', booking.customer_id)
    }

    // 7. Low Rating Escalation System
    if (overallRating <= 2 || moderationStatus === 'FLAGGED') {
      await supabase.from('notification_logs').insert({
        action: 'LOW_RATING_ESCALATION',
        error_stack: `Booking ${bookingId} left a ${overallRating}-star review for ${(booking.venues as any)?.name}. Reason: ${reviewText || 'None'}. Moderation: ${moderationStatus}.`,
        request_payload: parsed.data,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your rating! +20 XP and +10 Coins awarded!',
    })
  } catch (err: any) {
    console.error('Rating submit error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
