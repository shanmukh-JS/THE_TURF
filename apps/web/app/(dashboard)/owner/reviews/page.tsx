import { createClient } from '@/lib/supabase/server'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react'

export default async function OwnerReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let formattedReviews: any[] = []
  let averageRating = 0
  let totalReviews = 0
  const ratingDistribution = [0, 0, 0, 0, 0] // index 0 = 1★, index 4 = 5★

  if (user) {
    const { data: profile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', profile.id)

      if (venues && venues.length > 0) {
        const venueIds = venues.map((v) => v.id)

        const { data: reviews } = await supabase
          .from('reviews')
          .select(
            `
            id, 
            rating, 
            comment, 
            customer_id,
            created_at,
            venue:venues(name)
          `
          )
          .in('venue_id', venueIds)
          .order('created_at', { ascending: false })

        if (reviews && reviews.length > 0) {
          const customerIds = Array.from(new Set(reviews.map((r) => r.customer_id)))

          const { data: customerProfiles } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])

          const customerMap = new Map()
          if (customerProfiles) {
            customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }

          let totalScore = 0
          formattedReviews = reviews.map((r: any) => {
            const rating = Number(r.rating)
            totalScore += rating

            // Accumulate distribution
            if (rating >= 1 && rating <= 5) {
              const idx = rating - 1
              ratingDistribution[idx] = (ratingDistribution[idx] ?? 0) + 1
            }

            const dateStr = new Date(r.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return {
              id: r.id,
              customerName: customerMap.get(r.customer_id) || 'Unknown Customer',
              venueName: r.venue && !Array.isArray(r.venue) ? r.venue.name : 'Unknown Venue',
              date: dateStr,
              rating,
              comment: r.comment,
            }
          })

          totalReviews = reviews.length
          averageRating = Number((totalScore / reviews.length).toFixed(1))
        }
      }
    }
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Reviews</h1>
          <p className="text-gray-400 text-sm mt-1">Read and respond to feedback from your customers.</p>
        </div>
      </DashboardAnimationItem>

      {/* ═══ Rating Overview ═══ */}
      {totalReviews > 0 ? (
        <DashboardAnimationItem className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Rating Card */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
              <span className="text-5xl font-bold text-white">{averageRating}</span>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
          </div>

          {/* Rating Distribution */}
          <div className="lg:col-span-2 bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star - 1] || 0
                const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0

                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12 shrink-0">
                      <span className="text-sm font-medium text-white">{star}</span>
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </div>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right font-medium">{count} ({percentage}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </DashboardAnimationItem>
      ) : null}

      {/* ═══ Reviews List ═══ */}
      <DashboardAnimationItem>
        {formattedReviews.length === 0 ? (
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
              <MessageSquare className="w-10 h-10 text-amber-400/60" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Reviews Yet</h2>
            <p className="text-gray-400 max-w-md text-sm leading-relaxed">
              Complete more bookings to collect customer feedback. Reviews help build trust and attract new customers to your venues.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <TrendingUp className="w-5 h-5 text-green-400/50" />
                <span className="text-[10px] text-gray-500 font-medium text-center">Grow Bookings</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Star className="w-5 h-5 text-amber-400/50" />
                <span className="text-[10px] text-gray-500 font-medium text-center">Earn Ratings</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Users className="w-5 h-5 text-blue-400/50" />
                <span className="text-[10px] text-gray-500 font-medium text-center">Build Trust</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {formattedReviews.map((review, i) => (
              <div
                key={i}
                className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-[1px] hover:shadow-lg hover:shadow-black/30"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-600/20 flex items-center justify-center text-sm font-bold text-amber-400 border border-amber-500/10">
                      {review.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{review.customerName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-4 h-4 ${idx < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'}`}
                      />
                    ))}
                  </div>
                </div>

                {review.comment ? (
                  <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    &quot;{review.comment}&quot;
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No comment provided.</p>
                )}

                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Venue: <span className="text-gray-300">{review.venueName}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
