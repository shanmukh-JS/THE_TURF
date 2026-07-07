import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays,
  MapPin,
  TrendingUp,
  Heart,
  Bell,
  User,
  Plus,
  Compass,
  History,
  DollarSign,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default async function PlayerDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get customer profile name
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const displayName =
    profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player'

  // Fetch customer bookings
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(
      `
      id,
      total_amount,
      status,
      slots(date, start_time, end_time),
      venues(name, address)
    `
    )
    .eq('customer_id', user.id)

  const bookings = bookingsData || []

  // Calculations
  const totalBookings = bookings.length

  const now = new Date()
  const upcomingList = bookings
    .filter((b: any) => {
      if (b.status !== 'CONFIRMED' || !b.slots) return false
      const slotDate = new Date(b.slots.date)
      // Strip time for clean date comparison
      slotDate.setHours(23, 59, 59, 999)
      return slotDate >= now
    })
    .sort((a: any, b: any) => new Date(a.slots.date).getTime() - new Date(b.slots.date).getTime())

  const pastList = bookings
    .filter((b: any) => {
      if (!b.slots) return false
      const slotDate = new Date(b.slots.date)
      slotDate.setHours(23, 59, 59, 999)
      return slotDate < now
    })
    .sort((a: any, b: any) => new Date(b.slots.date).getTime() - new Date(a.slots.date).getTime())

  const upcomingBookingsCount = upcomingList.length

  const totalSpent = bookings
    .filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)

  // Get some venues to show in "Nearby/Explore Turfs"
  const { data: venuesData } = await supabase
    .from('venues')
    .select(
      `
      id,
      name,
      address,
      areas(name),
      venue_pricing(price)
    `
    )
    .eq('verification_status', 'APPROVED')
    .eq('is_disabled', false)
    .limit(3)

  const venues = venuesData || []

  // Fetch favorites count
  const { count: favoritesCount } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const totalFavorites = favoritesCount || 0

  // Next upcoming booking highlight
  const nextBooking: any = upcomingList[0] || null

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* Welcome Header */}
      <DashboardAnimationItem className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Hey, {displayName}! 👋</h1>
          <p className="text-gray-400 mt-1">
            Ready for your next innings? Book your slots instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/venues"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all shadow-lg shadow-green-900/30 text-sm"
          >
            <Plus className="w-4 h-4" /> Book a Turf
          </Link>
        </div>
      </DashboardAnimationItem>

      {/* Stats Cards */}
      <DashboardAnimationItem className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Bookings"
          value={totalBookings.toString()}
          accent="green"
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <StatCard
          label="Upcoming Bookings"
          value={upcomingBookingsCount.toString()}
          accent="blue"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Favorite Turfs"
          value={totalFavorites.toString()}
          accent="amber"
          icon={<Heart className="w-5 h-5" />}
        />
        <StatCard
          label="Total Spent"
          value={`₹${totalSpent.toLocaleString('en-IN')}`}
          accent="purple"
          icon={<DollarSign className="w-5 h-5" />}
        />
      </DashboardAnimationItem>

      {/* Main Grid */}
      <DashboardAnimationItem className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Upcoming & Recent */}
        <div className="lg:col-span-2 space-y-8">
          {/* Next Booking Highlight */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-green-900/10 to-emerald-950/10 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-green-400" />
              Your Next Innings
            </h2>
            {nextBooking ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 rounded-xl p-5 border border-white/5">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base">{nextBooking.venues?.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-400" /> {nextBooking.venues?.address}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-1 rounded-md font-medium">
                      {new Date(nextBooking.slots?.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-md">
                      {nextBooking.slots?.start_time
                        ? new Date(nextBooking.slots.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:self-center">
                  <Link
                    href="/player/bookings"
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-colors border border-white/5"
                  >
                    Reschedule
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5 space-y-3">
                <p className="text-sm text-gray-400">No upcoming bookings scheduled.</p>
                <Link
                  href="/venues"
                  className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  Browse local turfs and book a slot <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-green-400" />
                Recent Innings
              </h2>
              <Link
                href="/player/bookings"
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                View All
              </Link>
            </div>

            {pastList.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                You haven&apos;t played any matches yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {pastList.slice(0, 3).map((b: any, index) => (
                  <div
                    key={b.id || index}
                    className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {b.venues?.name || 'Unknown Venue'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.slots
                          ? new Date(b.slots.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}{' '}
                        •{' '}
                        {b.slots?.start_time
                          ? new Date(b.slots.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium">₹{b.total_amount}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          b.status === 'CONFIRMED'
                            ? 'bg-green-500/10 text-green-400'
                            : b.status === 'COMPLETED'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions & Nearby */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/venues"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 hover:border-green-500/30 border border-white/5 text-white text-sm font-semibold transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:bg-green-500 group-hover:text-black transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                Book a Turf
              </Link>
              <Link
                href="/player/bookings"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 hover:border-green-500/30 border border-white/5 text-white text-sm font-semibold transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-black transition-colors">
                  <CalendarDays className="w-4 h-4" />
                </div>
                View My Bookings
              </Link>
              <Link
                href="/venues"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 hover:border-green-500/30 border border-white/5 text-white text-sm font-semibold transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-black transition-colors">
                  <Compass className="w-4 h-4" />
                </div>
                Browse Turfs
              </Link>
            </div>
          </div>

          {/* Nearby Turfs */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Explore Nearby
              </h2>
              <Link href="/venues" className="text-xs text-green-400 hover:text-green-300">
                See All
              </Link>
            </div>

            <div className="space-y-4">
              {venues.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No venues listed yet.</p>
              ) : (
                venues.map((v: any, index) => (
                  <Link
                    key={v.id || index}
                    href={`/venues/${v.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-white/5 flex items-center justify-center text-xs font-bold text-green-400 flex-shrink-0">
                      {v.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-green-400 transition-colors">
                        {v.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{v.address}</p>
                      <p className="text-[10px] text-green-400 mt-1 font-semibold">
                        {v.venue_pricing?.price ? `₹${v.venue_pricing.price}/hr` : 'Pricing N/A'}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
