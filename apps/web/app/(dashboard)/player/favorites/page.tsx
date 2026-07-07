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

  // Fetch actual favorites
  const { data: rawFavorites } = await supabase
    .from('favorites')
    .select(
      `
      id,
      venues:venue_id (
        id,
        name,
        address,
        areas (name),
        venue_images (url, is_cover)
      )
    `
    )
    .eq('user_id', user.id)

  const favorites = (rawFavorites || []).map((fav: any) => {
    const venue = fav.venues || {}
    const coverImage =
      venue.venue_images?.find((img: any) => img.is_cover)?.url ||
      venue.venue_images?.[0]?.url ||
      'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80'
    return {
      id: fav.id,
      venue_id: venue.id,
      name: venue.name,
      address: venue.address,
      area: venue.areas?.name || 'Unknown Area',
      image: coverImage,
    }
  })

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white tracking-tight">Favorite Turfs</h1>
        <p className="text-gray-400 mt-1">Quickly access and book your preferred boxes.</p>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        {favorites.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No favorite turfs saved yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Browse through our list of venues and tap the heart icon to save them here.
              </p>
            </div>
            <Link
              href="/venues"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-xs transition-all"
            >
              <Compass className="w-4 h-4" /> Explore Turfs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-all group"
              >
                <div className="h-40 relative overflow-hidden bg-black/40">
                  <img
                    src={fav.image}
                    alt={fav.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-lg line-clamp-1">{fav.name}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-green-400" /> {fav.area}
                    </p>
                  </div>
                  <Link
                    href={`/venues/${fav.venue_id}`}
                    className="block w-full text-center px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors border border-white/5 mt-4"
                  >
                    Book Now
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
