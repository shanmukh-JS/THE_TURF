import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import Link from 'next/link'
import {
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  AlertCircle,
  Clock,
  TrendingUp,
  Flag,
} from 'lucide-react'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'Super Admin Dashboard | TRUF GAMING',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Query real data from Supabase tables
  const [
    { count: playersCount },
    { count: ownersCount },
    { count: pendingApprovalsCount },
    { count: activeTurfsCount },
    { count: bookingsCount },
    { data: revenueData },
    { data: recentOwners },
    { data: recentBookings },
    { data: pendingQueue },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'CUSTOMER'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'OWNER'),
    supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'PENDING'),
    supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'APPROVED'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('total_amount').eq('status', 'CONFIRMED'),

    // Recent Owner Registrations
    supabase.from('owner_profiles').select('*').order('id', { ascending: false }).limit(5),

    // Recent Bookings
    supabase
      .from('bookings')
      .select('id, total_amount, created_at, status, venues(name), users(email)')
      .order('id', { ascending: false })
      .limit(5),

    // Pending Approval Queue
    supabase
      .from('venues')
      .select('*, owner_profiles(full_name, business_name), cities(name)')
      .eq('verification_status', 'PENDING')
      .order('id', { ascending: false })
      .limit(5),
  ])

  // Calculate Revenue
  const totalRevenueVal = (revenueData || []).reduce((sum, b) => sum + Number(b.total_amount), 0)

  // Mocked Reports for MVP representation (since no database reports table exists yet)
  const recentReports = [
    {
      id: 'rp-1',
      turf: 'Olympia Turf',
      complaint: 'Overlapping bookings issue',
      user: 'arjun@gmail.com',
      time: '2 hours ago',
    },
  ]

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* Header */}
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time oversight of TRUF GAMING marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          {(pendingApprovalsCount || 0) > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {pendingApprovalsCount} Approvals Pending
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Platform Active</span>
          </div>
        </div>
      </DashboardAnimationItem>

      {/* KPI Cards Layout (Streamlined Dashboard Prompt) */}
      <DashboardAnimationItem className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard
          label="Total Players"
          value={playersCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="blue"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Total Turf Owners"
          value={ownersCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="purple"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovalsCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="amber"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Active Bookings"
          value={bookingsCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="green"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Active Turfs"
          value={activeTurfsCount?.toString() || '0'}
          change="+0"
          trend="up"
          accent="emerald"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Total Revenue"
          value={`₹${totalRevenueVal.toLocaleString()}`}
          change="+0%"
          trend="up"
          accent="green"
          icon={<DollarSign className="w-5 h-5" />}
        />
      </DashboardAnimationItem>

      {/* Main Grid Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Pending Approvals Queue */}
        <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending Approval Queue
            </h2>
            <Link
              href="/admin/approvals"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              Manage all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {!pendingQueue || pendingQueue.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No venues awaiting approval review.
              </div>
            ) : (
              pendingQueue.map((v) => (
                <div
                  key={v.id}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{v.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Owner: {v.owner_profiles?.full_name || 'N/A'} · City:{' '}
                      {v.cities?.name || 'N/A'}
                    </p>
                  </div>
                  <Link
                    href={`/admin/venues/${v.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                  >
                    Verify
                  </Link>
                </div>
              ))
            )}
          </div>
        </DashboardAnimationItem>

        {/* Recent Owner Registrations */}
        <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              Recent Owner Registrations
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {!recentOwners || recentOwners.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No turf owners registered yet.
              </div>
            ) : (
              recentOwners.map((owner) => (
                <div
                  key={owner.id}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{owner.full_name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{owner.business_name}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400">
                    OWNER
                  </span>
                </div>
              ))
            )}
          </div>
        </DashboardAnimationItem>

        {/* Recent Bookings */}
        <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-green-400" />
              Recent Bookings
            </h2>
            <Link
              href="/admin/bookings"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {!recentBookings || recentBookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No bookings recorded yet.</div>
            ) : (
              recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {(b.venues as any)?.name || 'Venue'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Gamer: {(b.users as any)?.email || 'Customer'} ·{' '}
                      {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₹{b.total_amount}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardAnimationItem>

        {/* Recent Reports */}
        <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-400" />
              Recent Reports
            </h2>
            <Link
              href="/admin/reports"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentReports.map((r, i) => (
              <div
                key={i}
                className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white">{r.complaint}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Turf: {r.turf} · Reported by: {r.user}
                  </p>
                </div>
                <span className="text-xs text-gray-500">{r.time}</span>
              </div>
            ))}
          </div>
        </DashboardAnimationItem>
      </div>
    </DashboardAnimationWrapper>
  )
}
