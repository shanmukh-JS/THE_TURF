import { Heart, MapPin, Star, Compass } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'My Favorites | TURF GAMING',
}

export default async function CustomerFavoritesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch actual favorites and recommendations in parallel
  const [{ data: rawFavorites }, { data: recommendedVenuesData }] = await Promise.all([
    supabase.from('favorites').select('id, venue_id').eq('user_id', user.id),
    supabase
      .from('venues')
      .select(
        `
        id,
        name,
        address,
        areas (name),
        cities (name),
        venue_pricing (price),
        venue_images (url, is_cover),
        reviews (rating)
      `
      )
      .eq('verification_status', 'APPROVED')
      .eq('is_disabled', false)
      .limit(3),
  ])

  const favVenueIds = (rawFavorites || []).map((fav: any) => fav.venue_id).filter(Boolean)
  let favoritedVenues: any[] = []
  if (favVenueIds.length > 0) {
    const { data } = await supabase
      .from('venues')
      .select(
        `
        id,
        name,
        address,
        areas (name),
        cities (name),
        venue_pricing (price),
        venue_images (url, is_cover),
        reviews (rating)
      `
      )
      .in('id', favVenueIds)
    favoritedVenues = data || []
  }

  const mapVenueData = (v: any) => {
    if (!v) return null
    const coverImage =
      v.venue_images?.find((img: any) => img.is_cover)?.url ||
      v.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'

    const price = Array.isArray(v.venue_pricing)
      ? v.venue_pricing[0]?.price
      : v.venue_pricing?.price || 1000

    const reviewsList = v.reviews || []
    const rating =
      reviewsList.length > 0
        ? (
            reviewsList.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
            reviewsList.length
          ).toFixed(1)
        : null

    const area = v.areas?.name || v.address?.split(',')[0]?.trim() || 'Unknown Area'
    const city = v.cities?.name || v.address?.split(',')[4]?.trim() || 'Unknown City'

    return {
      id: v.id,
      name: v.name,
      address: v.address,
      area,
      city,
      price,
      image: coverImage,
      rating,
      reviewsCount: reviewsList.length,
    }
  }

  const favorites = (rawFavorites || [])
    .map((fav: any) => {
      const venue = favoritedVenues.find((v: any) => v.id === fav.venue_id)
      if (!venue) return null
      const mapped = mapVenueData(venue)
      if (!mapped) return null
      return {
        id: fav.id,
        venue_id: mapped.id,
        name: mapped.name,
        address: mapped.address,
        area: mapped.area,
        city: mapped.city,
        price: mapped.price,
        image: mapped.image,
        rating: mapped.rating,
        reviewsCount: mapped.reviewsCount,
      }
    })
    .filter(Boolean) as any[]

  const recommendations = (recommendedVenuesData || [])
    .map((v: any) => mapVenueData(v))
    .filter(Boolean) as any[]

  return (
    <DashboardAnimationWrapper className="p-8 space-y-12">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Favorite Turfs</h1>
        <p className="text-gray-400 mt-1">Quickly access and book your preferred boxes.</p>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        {favorites.length === 0 ? (
          <div className="space-y-12">
            {/* Premium Empty State */}
            <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl bg-white/[0.01] max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                <Heart className="w-8 h-8 fill-red-500/20" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">No Favorite Turfs Saved</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Explore available boxes near you and tap the heart icon to save them here for
                  instant booking.
                </p>
              </div>
              <Link
                href="/venues"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-xs transition-all shadow-lg hover:shadow-green-500/20"
              >
                <Compass className="w-4 h-4" /> Explore Turfs
              </Link>
            </div>

            {/* Recommended/Trending Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Recommended Nearby</h2>
                <p className="text-xs text-gray-400 mt-0.5">Top-rated cricket boxes active today</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden hover:border-white/15 transition-all group"
                  >
                    <div className="h-40 relative overflow-hidden bg-black/40">
                      <img
                        src={rec.image}
                        alt={rec.name}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      <span className="absolute top-3 right-3 px-2 py-1 rounded bg-black/55 backdrop-blur-md text-white text-xs font-bold font-mono">
                        ₹{rec.price}/hr
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-white text-sm group-hover:text-green-400 transition-colors truncate">
                            {rec.name}
                          </h4>
                          {rec.rating ? (
                            <span className="text-xs text-yellow-400 flex items-center gap-1 font-semibold flex-shrink-0">
                              <Star className="w-3.5 h-3.5 fill-yellow-400" /> {rec.rating}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1 font-semibold flex-shrink-0">
                              <Star className="w-3.5 h-3.5 text-gray-500" /> New
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-green-400" /> {rec.area}
                        </p>
                      </div>
                      <Link
                        href={`/venues/${rec.id}`}
                        className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-green-500 hover:text-black border border-white/8 hover:border-green-500 text-white font-bold text-xs transition-all"
                      >
                        Quick Book
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden hover:border-white/15 transition-all group"
              >
                <div className="h-40 relative overflow-hidden bg-black/40">
                  <img
                    src={fav.image}
                    alt={fav.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute bottom-3 right-3 text-white text-xs font-bold font-mono">
                    ₹{fav.price}/hr
                  </span>
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center border border-white/10 text-red-500">
                    <Heart className="w-4 h-4 fill-red-500" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-sm group-hover:text-green-400 transition-colors line-clamp-1">
                        {fav.name}
                      </h3>
                      {fav.rating ? (
                        <span className="text-xs text-yellow-400 flex items-center gap-1 font-semibold flex-shrink-0">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" /> {fav.rating}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1 font-semibold flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-gray-500" /> New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-green-400" /> {fav.area}
                    </p>
                  </div>
                  <Link
                    href={`/venues/${fav.venue_id}`}
                    className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-green-500 hover:text-black border border-white/8 hover:border-green-500 text-white font-bold text-xs transition-all"
                  >
                    Quick Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
