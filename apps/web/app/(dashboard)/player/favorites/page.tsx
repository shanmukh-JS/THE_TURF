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

  // We mock the favorites list since the database schema doesn't have a favorites table yet.
  // This satisfies the MVP design.
  const favorites: any[] = []

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
            {/* If we had mock favorites, they would go here */}
          </div>
        )}
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
