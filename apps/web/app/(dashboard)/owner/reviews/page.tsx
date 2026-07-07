import { createClient } from '@/lib/supabase/server'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { Star, MessageSquare } from 'lucide-react'

export default async function OwnerReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let formattedReviews: any[] = []
  let averageRating = 0

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
            totalScore += Number(r.rating)
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
              rating: Number(r.rating),
              comment: r.comment,
            }
          })

          averageRating = Number((totalScore / reviews.length).toFixed(1))
        }
      }
    }
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Customer Reviews</h1>
          <p className="text-gray-400">Read and respond to feedback from your customers.</p>
        </div>

        {formattedReviews.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-400 leading-none">{averageRating}</p>
              <p className="text-xs text-amber-400/80 font-medium">Average Rating</p>
            </div>
          </div>
        )}
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        {formattedReviews.length === 0 ? (
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Reviews Yet</h2>
            <p className="text-gray-400 max-w-md">
              Customer ratings and reviews for your venues will appear here after they complete
              their bookings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {formattedReviews.map((review, i) => (
              <div
                key={i}
                className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 hover:border-white/10 transition-colors"
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
                    "{review.comment}"
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
