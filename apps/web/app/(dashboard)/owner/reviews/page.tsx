'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  Star,
  MessageSquare,
  TrendingUp,
  Users,
  RefreshCw,
  Send,
  ShieldAlert,
  Award,
} from 'lucide-react'

export default function OwnerReviewsPage() {
  const supabase = createClient()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [ratings, setRatings] = useState<any[]>([])
  const [categoryAverages, setCategoryAverages] = useState<any>({
    ground: 0,
    lighting: 0,
    staff: 0,
    cleanliness: 0,
    value: 0,
  })
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({})

  const fetchReviews = async () => {
    if (!user) return

    setLoading(true)

    // 1. Fetch Owner Profile
    const { data: ownerProfile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!ownerProfile) {
      setLoading(false)
      return
    }

    // 2. Fetch Owner's Venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', ownerProfile.id)

    if (venues && venues.length > 0) {
      const venueIds = venues.map((v) => v.id)

      // 3. Fetch Ratings (with replies)
      const { data: ratingsData, error } = await supabase
        .from('venue_ratings')
        .select(
          `
          id,
          overall_rating,
          ground_quality,
          lighting,
          staff_behaviour,
          cleanliness,
          value_for_money,
          comments,
          sentiment,
          sentiment_breakdown,
          ai_summary,
          created_at,
          user_id,
          bookings(venue_id, venues(name)),
          venue_rating_replies(reply_text, created_at)
        `
        )
        .order('created_at', { ascending: false })

      if (ratingsData) {
        // Filter rows matching owner's venues in memory since nested queries can have RLS restrictions
        const filtered = ratingsData.filter((r: any) => venueIds.includes(r.bookings?.venue_id))

        // Resolve Player Profile Names
        const customerIds = Array.from(new Set(filtered.map((r: any) => r.user_id)))
        const { data: customerProfiles } = await supabase
          .from('customer_profiles')
          .select('user_id, full_name')
          .in('user_id', customerIds)

        const customerMap = new Map()
        if (customerProfiles) {
          customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
        }

        let totalOverall = 0
        let totalGround = 0
        let totalLight = 0
        let totalStaff = 0
        let totalClean = 0
        let totalVal = 0

        const formatted = filtered.map((r: any) => {
          totalOverall += r.overall_rating
          totalGround += r.ground_quality
          totalLight += r.lighting
          totalStaff += r.staff_behaviour
          totalClean += r.cleanliness
          totalVal += r.value_for_money

          const dateStr = new Date(r.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return {
            id: r.id,
            customerName: customerMap.get(r.user_id) || 'Gamer',
            venueName: r.bookings?.venues?.name || 'My Turf',
            date: dateStr,
            overall: r.overall_rating,
            ground: r.ground_quality,
            light: r.lighting,
            staff: r.staff_behaviour,
            clean: r.cleanliness,
            value: r.value_for_money,
            comments: r.comments,
            sentiment: r.sentiment,
            breakdown: r.sentiment_breakdown || {},
            aiSummary: r.ai_summary,
            reply: r.venue_rating_replies?.[0]?.reply_text || null,
          }
        })

        const count = filtered.length || 1
        setCategoryAverages({
          ground: Number((totalGround / count).toFixed(1)),
          lighting: Number((totalLight / count).toFixed(1)),
          staff: Number((totalStaff / count).toFixed(1)),
          cleanliness: Number((totalClean / count).toFixed(1)),
          value: Number((totalVal / count).toFixed(1)),
        })

        setRatings(formatted)
        setTotalReviews(filtered.length)
        setAverageRating(Number((totalOverall / count).toFixed(1)))
      }
    }

    setLoading(false)
  }

  const handleReplySubmit = async (ratingId: string) => {
    const text = replyText[ratingId]
    if (!text?.trim()) return

    setReplyLoading((prev) => ({ ...prev, [ratingId]: true }))
    try {
      const { data: ownerProfile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!ownerProfile) throw new Error('Owner profile not found')

      const { error } = await supabase.from('venue_rating_replies').insert({
        rating_id: ratingId,
        owner_id: ownerProfile.id,
        reply_text: text,
      })

      if (error) throw error

      setReplyText((prev) => ({ ...prev, [ratingId]: '' }))
      fetchReviews()
    } catch (err: any) {
      alert(err.message || 'Failed to post reply')
    } finally {
      setReplyLoading((prev) => ({ ...prev, [ratingId]: false }))
    }
  }

  useEffect(() => {
    if (user) fetchReviews()
  }, [user])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#060d06] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide">
          Calculating review metrics...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 bg-[#060d06] min-h-screen text-white">
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Customer Feedbacks</h1>
          <p className="text-gray-400 text-xs mt-1">
            Analyze ratings, inspect AI sentiments, and reply to players.
          </p>
        </div>
      </DashboardAnimationItem>

      {totalReviews > 0 ? (
        <DashboardAnimationItem className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Average overall */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              <span className="text-5xl font-extrabold">{averageRating}</span>
            </div>
            <p className="text-xs text-gray-400">Venue Quality Score ({totalReviews} reviews)</p>
          </div>

          {/* Breakdown cards */}
          <div className="lg:col-span-2 bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
                Pitch Quality
              </span>
              <span className="text-lg font-bold text-white">{categoryAverages.ground} / 5</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
                Lighting
              </span>
              <span className="text-lg font-bold text-white">{categoryAverages.lighting} / 5</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
                Cleanliness
              </span>
              <span className="text-lg font-bold text-white">
                {categoryAverages.cleanliness} / 5
              </span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
                Staff Behaviour
              </span>
              <span className="text-lg font-bold text-white">{categoryAverages.staff} / 5</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
                Value for Money
              </span>
              <span className="text-lg font-bold text-white">{categoryAverages.value} / 5</span>
            </div>
          </div>
        </DashboardAnimationItem>
      ) : null}

      <DashboardAnimationItem>
        {ratings.length === 0 ? (
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No Ratings Submitted</h3>
            <p className="text-xs text-gray-500 mt-1">
              Review notifications will trigger post-match.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {ratings.map((review) => (
              <div
                key={review.id}
                className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4 hover:border-white/12 transition-all"
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm">{review.customerName}</h4>
                    <span className="text-[10px] text-gray-500">
                      {review.date} • {review.venueName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {review.overall} Stars
                    </span>

                    {/* Sentiment Pill */}
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        review.sentiment === 'POSITIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : review.sentiment === 'NEGATIVE'
                            ? 'bg-red-500/20 text-red-400 font-bold'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {review.sentiment}
                    </span>
                  </div>
                </div>

                {/* Sub category details */}
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                  <span>Pitch: {review.ground}★</span>
                  <span>Light: {review.light}★</span>
                  <span>Staff: {review.staff}★</span>
                  <span>Cleanliness: {review.clean}★</span>
                  <span>Value: {review.value}★</span>
                </div>

                {/* Comment & AI Summary */}
                {review.comments ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-300 italic">&quot;{review.comments}&quot;</p>
                    {review.aiSummary && (
                      <p className="text-[9px] text-green-400 bg-green-950/20 border border-green-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 flex-shrink-0" />
                        AI Summary: {review.aiSummary}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No comments submitted.</p>
                )}

                {/* Topic tags breakdown */}
                {Object.keys(review.breakdown).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(review.breakdown).map(([k, val]) => (
                      <span
                        key={k}
                        className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                          val === 'Positive'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400 font-bold'
                        }`}
                      >
                        {k}: {String(val)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Replies section */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  {review.reply ? (
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold">
                        My Reply
                      </span>
                      <p className="text-xs text-gray-300">{review.reply}</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a reply response..."
                        value={replyText[review.id] || ''}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/40"
                      />
                      <button
                        onClick={() => handleReplySubmit(review.id)}
                        disabled={replyLoading[review.id]}
                        className="p-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black transition-all flex items-center justify-center disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
