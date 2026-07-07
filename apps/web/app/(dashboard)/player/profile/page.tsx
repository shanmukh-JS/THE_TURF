import { createClient } from '@/lib/supabase/server'
import { User, Mail, Shield, CalendarCheck, Award, Heart, Activity } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'My Profile | TURF GAMING',
}

export default async function CustomerProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch bookings and favorites to populate profile stats
  const [{ data: bookingsData }, { data: favoritesData }] = await Promise.all([
    supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        slots(date, start_time),
        venues(name)
      `
      )
      .eq('customer_id', user.id),
    supabase
      .from('favorites')
      .select(
        `
        venues:venue_id (name)
      `
      )
      .eq('user_id', user.id)
      .limit(1),
  ])

  const bookings = bookingsData || []
  const matchesPlayed = bookings.filter((b: any) => b.status === 'COMPLETED').length

  const favVenue: any = favoritesData?.[0]?.venues
  const firstFavName = Array.isArray(favVenue) ? favVenue[0]?.name : favVenue?.name

  const firstBookedVenue: any = bookings?.[0]?.venues
  const firstBookedName = Array.isArray(firstBookedVenue)
    ? firstBookedVenue[0]?.name
    : firstBookedVenue?.name

  const favoriteTurf = firstFavName || firstBookedName || 'None yet'

  const totalXp = bookings.length * 250
  const level = 1 + Math.floor(totalXp / 1000)
  const xp = totalXp % 1000
  const xpTarget = 1000

  const fullName = user.user_metadata?.full_name || 'Valued Gamer'
  const role = user.user_metadata?.role || 'CUSTOMER'
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* 1. Profile Header with Stadium Cover Banner */}
      <DashboardAnimationItem className="relative rounded-3xl border border-white/8 overflow-hidden bg-black">
        {/* Banner overlay background */}
        <div
          className="h-44 bg-cover bg-center relative"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        {/* Profile Identity overlay */}
        <div className="px-8 pb-6 flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 relative z-10">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur opacity-30" />
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0f240f] to-green-950 border-2 border-green-500/40 flex items-center justify-center text-4xl font-extrabold text-green-400 relative">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-xs font-black text-black shadow-lg">
              {level}
            </div>
          </div>

          <div className="space-y-1 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
              {fullName}
            </h1>
            <p className="text-sm text-gray-400">{user.email}</p>
            <div className="text-[10px] uppercase font-bold tracking-widest text-green-400 mt-2 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded w-fit">
              Level {level} · Amateur League
            </div>
          </div>

          <button className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/8 text-xs uppercase tracking-wider transition-all sm:self-end">
            Edit Profile
          </button>
        </div>
      </DashboardAnimationItem>

      {/* Profile Metrics Grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: XP and Bio Details */}
        <div className="md:col-span-2 space-y-8">
          {/* XP Progress Bar */}
          <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Leveling Progress
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Keep playing to unlock new leagues</p>
              </div>
              <span className="text-sm font-mono text-green-400 font-bold">
                {xp} / {xpTarget} XP
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 border border-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${(xp / xpTarget) * 100}%` }}
              />
            </div>
          </DashboardAnimationItem>

          {/* Bio Account details */}
          <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Account Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                  {fullName}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5 truncate">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Member Since
                </label>
                <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                  {memberSince}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                  Platform Role
                </label>
                <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5 capitalize">
                  {role.toLowerCase()}
                </div>
              </div>
            </div>
          </DashboardAnimationItem>
        </div>

        {/* Right Column: Statistics */}
        <DashboardAnimationItem className="space-y-6">
          {/* Quick Statistics Widget */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Player Statistics
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-base">{matchesPlayed}</h4>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">
                    Matches Played
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-extrabold text-sm truncate">{favoriteTurf}</h4>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Favorite Turf</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-base">Amateur</h4>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">
                    Current League
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings shortcut */}
          <Link
            href="/player/bookings"
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-green-500/30 transition-all p-5 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-sm">My Bookings</h3>
                <p className="text-xs text-gray-500">View your reservations</p>
              </div>
            </div>
            <div className="text-gray-600 group-hover:text-white transition-colors">→</div>
          </Link>
        </DashboardAnimationItem>
      </div>
    </DashboardAnimationWrapper>
  )
}
