import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Building2,
  Users,
  DollarSign,
  CalendarCheck,
  AlertCircle,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch real statistics
  const [
    { count: bookingsCount },
    { count: venuesCount },
    { count: usersCount },
    { data: pendingVenues },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'APPROVED'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'CUSTOMER'),
    supabase
      .from('venues')
      .select('*, owner_profiles(full_name), cities(name)')
      .eq('verification_status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Mock activity feed (we don't have an activity table yet)
  const recentActivity = [
    {
      type: 'booking',
      text: 'New booking by Arjun Mehta at Olympia Turf',
      time: '2m ago',
      icon: CalendarCheck,
      color: 'text-green-400',
    },
    {
      type: 'payment',
      text: 'Settlement of ₹12,400 processed to Rajesh Kumar',
      time: '1d ago',
      icon: DollarSign,
      color: 'text-amber-400',
    },
    {
      type: 'alert',
      text: 'Dispute raised for Booking #BK045',
      time: '2d ago',
      icon: ShieldAlert,
      color: 'text-red-400',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-gray-400 mt-1">Real-time health of TRUF GAMING marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          {(pendingVenues?.length || 0) > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {pendingVenues?.length} Venues Pending Review
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Platform Live</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Revenue (GMV)"
          value="₹0"
          change="+0%"
          trend="up"
          accent="green"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Total Bookings"
          value={bookingsCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="blue"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Active Venues"
          value={venuesCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="amber"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Registered Users"
          value={usersCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="purple"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Venues Pending Approval */}
        <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Venues Awaiting Approval</h2>
            </div>
            <Link
              href="/admin/venues"
              className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5 flex-1">
            {!pendingVenues || pendingVenues.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 text-sm">
                No venues awaiting approval.
              </div>
            ) : (
              pendingVenues.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{v.name}</p>
                      <p className="text-xs text-gray-500">
                        {v.owner_profiles?.full_name || 'Unknown Owner'} ·{' '}
                        {v.cities?.name || 'Unknown City'} ·{' '}
                        {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                      PENDING
                    </span>
                    <Link
                      href={`/admin/venues/${v.id}`}
                      className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors border border-green-500/20"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-1">
          <h2 className="text-sm font-semibold text-white mb-4">Live Activity Feed</h2>
          <div className="space-y-4">
            {recentActivity.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    <Icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 leading-snug">{a.text}</p>
                    <p className="text-xs text-gray-600 mt-1">{a.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
