'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  ArrowRight,
  TrendingDown,
  BarChart3,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Live' },
  PENDING: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Pending' },
  REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Rejected' },
}

function CheckCircle(props: any) {
  return <CheckCircleIcon {...props} />
}
function XCircle(props: any) {
  return <XCircleIcon {...props} />
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={props.className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function XCircleIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={props.className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // Raw counts
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [newPlayersToday, setNewPlayersToday] = useState(0)
  const [activePlayersToday, setActivePlayersToday] = useState(0)

  const [totalOwners, setTotalOwners] = useState(0)
  const [verifiedOwners, setVerifiedOwners] = useState(0)
  const [pendingOwners, setPendingOwners] = useState(0)

  const [totalTurfs, setTotalTurfs] = useState(0)
  const [liveTurfs, setLiveTurfs] = useState(0)
  const [pendingTurfs, setPendingTurfs] = useState(0)
  const [highestRatedTurf, setHighestRatedTurf] = useState<string | null>(null)
  const [mostBookedTurf, setMostBookedTurf] = useState<string | null>(null)

  const [totalBookings, setTotalBookings] = useState(0)
  const [todayBookings, setTodayBookings] = useState(0)
  const [completedBookings, setCompletedBookings] = useState(0)
  const [cancelledBookings, setCancelledBookings] = useState(0)
  const [successRate, setSuccessRate] = useState(100)

  const [todayRevenue, setTodayRevenue] = useState(0)
  const [weeklyRevenue, setWeeklyRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)

  // Trends
  const [revenueSparkline, setRevenueSparkline] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [bookingSparkline, setBookingSparkline] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [playerRegistrationsSpark, setPlayerRegistrationsSpark] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0,
  ])
  const [ownerRegistrationsSpark, setOwnerRegistrationsSpark] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0,
  ])

  // Tables
  const [pendingQueue, setPendingQueue] = useState<any[]>([])
  const [recentOwners, setRecentOwners] = useState<any[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])

  // Reports
  const [pendingReportsCount, setPendingReportsCount] = useState(1)

  const fetchAdminStats = async () => {
    setLoading(true)

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)

    // 1. Fetch Users
    const { data: users } = await supabase
      .from('users')
      .select('id, role, created_at, is_suspended')

    if (users) {
      const players = users.filter((u) => u.role === 'CUSTOMER')
      const owners = users.filter((u) => u.role === 'OWNER')

      setTotalPlayers(players.length)
      setTotalOwners(owners.length)

      // Registrations today
      setNewPlayersToday(players.filter((p) => p.created_at?.startsWith(todayStr)).length)
      setPendingOwners(owners.filter((o) => o.is_suspended).length) // Simple representation
      setVerifiedOwners(owners.filter((o) => !o.is_suspended).length)

      // Daily Registration Sparklines (Last 7 Days)
      const playerRegMap = new Map<string, number>()
      const ownerRegMap = new Map<string, number>()

      users.forEach((u) => {
        const key = u.created_at?.split('T')[0] || ''
        if (u.role === 'CUSTOMER') playerRegMap.set(key, (playerRegMap.get(key) || 0) + 1)
        if (u.role === 'OWNER') ownerRegMap.set(key, (ownerRegMap.get(key) || 0) + 1)
      })

      const pSpark: number[] = []
      const oSpark: number[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const k = d.toISOString().split('T')[0] as string
        pSpark.push(playerRegMap.get(k) || 0)
        oSpark.push(ownerRegMap.get(k) || 0)
      }
      setPlayerRegistrationsSpark(pSpark)
      setOwnerRegistrationsSpark(oSpark)
    }

    // 2. Fetch Venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, verification_status, rating')

    if (venues) {
      setTotalTurfs(venues.length)
      setLiveTurfs(venues.filter((v) => v.verification_status === 'APPROVED').length)
      setPendingTurfs(venues.filter((v) => v.verification_status === 'PENDING').length)

      // Highest rated
      let topRated = '—'
      let maxRating = 0
      venues.forEach((v) => {
        const rating = Number(v.rating || 0)
        if (rating > maxRating) {
          maxRating = rating
          topRated = v.name
        }
      })
      setHighestRatedTurf(topRated)
    }

    // 3. Fetch Bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select(
        'id, total_amount, status, created_at, venue_id, customer_id, slots(date, start_time)'
      )
      .order('created_at', { ascending: false })

    if (bookings) {
      setTotalBookings(bookings.length)
      setCompletedBookings(
        bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CONFIRMED').length
      )
      setCancelledBookings(bookings.filter((b) => b.status === 'CANCELLED').length)

      // Compute success rate
      const attempted = bookings.length
      const success = bookings.filter((b) => b.status !== 'CANCELLED').length
      setSuccessRate(attempted > 0 ? Math.round((success / attempted) * 100) : 100)

      let tRev = 0
      let wRev = 0
      let mRev = 0
      let totalRev = 0
      let todayB = 0

      // Sparkline maps
      const dailyRevMap = new Map<string, number>()
      const dailyBookMap = new Map<string, number>()
      const turfBookingsCount = new Map<string, number>()
      const activeCustomers = new Set<string>()

      bookings.forEach((b: any) => {
        const slot = b.slots && !Array.isArray(b.slots) ? b.slots : null
        const amount = Number(b.total_amount)
        const dateStr = slot?.date || ''

        if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
          totalRev += amount
          activeCustomers.add(b.customer_id)

          // Revenue timelines
          const createdDate = new Date(b.created_at)
          if (dateStr === todayStr) {
            tRev += amount
            todayB++
          }
          if (createdDate >= weekAgo) wRev += amount
          if (createdDate >= monthAgo) mRev += amount

          // Sparklines
          if (createdDate >= weekAgo) {
            const dateKey = createdDate.toISOString().split('T')[0] as string
            dailyRevMap.set(dateKey, (dailyRevMap.get(dateKey) || 0) + amount)
            dailyBookMap.set(dateKey, (dailyBookMap.get(dateKey) || 0) + 1)
          }

          // Turf booking counter
          turfBookingsCount.set(b.venue_id, (turfBookingsCount.get(b.venue_id) || 0) + 1)
        }
      })

      setTodayRevenue(tRev)
      setWeeklyRevenue(wRev)
      setMonthlyRevenue(mRev)
      setTotalRevenue(totalRev)
      setTodayBookings(todayB)
      setActivePlayersToday(activeCustomers.size)

      // Sparkline arrays
      const revSpark: number[] = []
      const bookSpark: number[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const k = d.toISOString().split('T')[0] as string
        revSpark.push(dailyRevMap.get(k) || 0)
        bookSpark.push(dailyBookMap.get(k) || 0)
      }
      setRevenueSparkline(revSpark)
      setBookingSparkline(bookSpark)

      // Most booked turf
      let maxBookings = 0
      let topBookedId = ''
      turfBookingsCount.forEach((count, id) => {
        if (count > maxBookings) {
          maxBookings = count
          topBookedId = id
        }
      })
      if (topBookedId && venues) {
        const found = venues.find((v) => v.id === topBookedId)
        setMostBookedTurf(found ? found.name : '—')
      }
    }

    // 4. Load Pending Queue Table
    const { data: pQueue } = await supabase
      .from('venues')
      .select('*, owner_profiles(full_name, business_name), cities(name)')
      .eq('verification_status', 'PENDING')
      .order('id', { ascending: false })
      .limit(5)

    if (pQueue) setPendingQueue(pQueue)

    // 5. Load Recent Owner Registrations
    const { data: recOwners } = await supabase
      .from('owner_profiles')
      .select('*')
      .order('id', { ascending: false })
      .limit(5)

    if (recOwners) setRecentOwners(recOwners)

    // 6. Load Recent Bookings
    const { data: recBookings } = await supabase
      .from('bookings')
      .select('id, total_amount, created_at, status, venues(name), users(email)')
      .order('id', { ascending: false })
      .limit(5)

    if (recBookings) {
      const formatted = recBookings.map((b: any) => ({
        id: b.id,
        turfName: b.venues?.name || 'Venue',
        email: b.users?.email || 'Customer',
        date: new Date(b.created_at).toLocaleDateString(),
        amount: b.total_amount,
        status: b.status,
      }))
      setRecentBookings(formatted)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchAdminStats()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () =>
        fetchAdminStats()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () =>
        fetchAdminStats()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () =>
        fetchAdminStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading platform statistics...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* Header */}
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time oversight of TURF GAMING marketplace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingTurfs > 0 && (
            <Link
              href="/admin/approvals"
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-semibold">
                {pendingTurfs} Approvals Pending
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold">Platform Active</span>
          </div>
        </div>
      </DashboardAnimationItem>

      {/* KPI Cards Grid */}
      <DashboardAnimationItem className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <Link href="/admin/users" className="block">
          <StatCardDetailed
            label="Total Players"
            value={totalPlayers.toString()}
            subValue={`${newPlayersToday} new today`}
            subLabel="Active today: "
            subLabelVal={activePlayersToday.toString()}
            accent="blue"
            icon={<Users className="w-5 h-5" />}
            sparkline={playerRegistrationsSpark}
          />
        </Link>
        <Link href="/admin/users" className="block">
          <StatCardDetailed
            label="Total Owners"
            value={totalOwners.toString()}
            subValue={`${verifiedOwners} verified`}
            subLabel="Pending: "
            subLabelVal={pendingOwners.toString()}
            accent="purple"
            icon={<Users className="w-5 h-5" />}
            sparkline={ownerRegistrationsSpark}
          />
        </Link>
        <Link href="/admin/approvals" className="block">
          <StatCardDetailed
            label="Pending Approvals"
            value={pendingTurfs.toString()}
            subValue={`Total: ${totalTurfs}`}
            subLabel="Live turfs: "
            subLabelVal={liveTurfs.toString()}
            accent="amber"
            icon={<Clock className="w-5 h-5" />}
          />
        </Link>
        <Link href="/admin/bookings" className="block">
          <StatCardDetailed
            label="Active Bookings"
            value={totalBookings.toString()}
            subValue={`${todayBookings} today`}
            subLabel="Success rate: "
            subLabelVal={`${successRate}%`}
            accent="green"
            icon={<CalendarCheck className="w-5 h-5" />}
            sparkline={bookingSparkline}
          />
        </Link>
        <Link href="/admin/venues" className="block">
          <StatCardDetailed
            label="Active Turfs"
            value={liveTurfs.toString()}
            subValue={`Most booked: ${mostBookedTurf || '—'}`}
            subLabel="Top rated: "
            subLabelVal={highestRatedTurf || '—'}
            accent="emerald"
            icon={<Building2 className="w-5 h-5" />}
          />
        </Link>
        <Link href="/admin/payments" className="block">
          <StatCardDetailed
            label="Total Revenue"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            subValue={`₹${todayRevenue.toLocaleString('en-IN')} today`}
            subLabel="This Month: "
            subLabelVal={`₹${monthlyRevenue.toLocaleString('en-IN')}`}
            accent="green"
            icon={<DollarSign className="w-5 h-5" />}
            sparkline={revenueSparkline}
          />
        </Link>
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
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              Manage all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {pendingQueue.length === 0 ? (
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
                    href="/admin/approvals"
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
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentOwners.length === 0 ? (
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
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No bookings recorded yet.</div>
            ) : (
              recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{b.turfName}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Gamer: {b.email} · {b.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      ₹{b.amount.toLocaleString('en-IN')}
                    </p>
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
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {pendingReportsCount === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No active reports.</div>
            ) : (
              <div className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div>
                  <h4 className="text-sm font-semibold text-white">Overlapping bookings issue</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Turf: Olympia Turf · Reported by: arjun@gmail.com
                  </p>
                </div>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
            )}
          </div>
        </DashboardAnimationItem>
      </div>
    </DashboardAnimationWrapper>
  )
}

function StatCardDetailed({
  label,
  value,
  subValue,
  subLabel,
  subLabelVal,
  accent,
  icon,
  sparkline,
}: {
  label: string
  value: string
  subValue: string
  subLabel: string
  subLabelVal: string
  accent: string
  icon: React.ReactNode
  sparkline?: number[]
}) {
  const accentMap: Record<string, string> = {
    green:
      'from-green-500/10 to-emerald-500/5 border-green-500/20 hover:border-green-500/50 hover:from-green-500/20',
    blue: 'from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/50 hover:from-blue-500/20',
    purple:
      'from-purple-500/10 to-violet-500/5 border-purple-500/20 hover:border-purple-500/50 hover:from-purple-500/20',
    amber:
      'from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-500/50 hover:from-amber-500/20',
    emerald:
      'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/50 hover:from-emerald-500/20',
  }
  const iconMap: Record<string, string> = {
    green: 'bg-green-500/15 text-green-400 group-hover:bg-green-500/25 transition-all duration-300',
    blue: 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 transition-all duration-300',
    purple:
      'bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 transition-all duration-300',
    amber: 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 transition-all duration-300',
    emerald:
      'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-all duration-300',
  }

  const sparklinePath = useMemo(() => {
    if (!sparkline || sparkline.length === 0) return ''
    const max = Math.max(...sparkline, 1)
    const width = 60
    const height = 18
    const points = sparkline.map((v, i) => {
      const x = (i / (sparkline.length - 1)) * width
      const y = height - (v / max) * height
      return `${x},${y}`
    })
    return `M${points.join(' L')}`
  }, [sparkline])

  return (
    <div
      className={`group relative rounded-2xl border bg-gradient-to-br p-5 overflow-hidden transition-all duration-300 hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/40 ${accentMap[accent] || accentMap.green}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconMap[accent] || iconMap.green}`}
            >
              {icon}
            </div>
            {sparkline && sparkline.some((v) => v > 0) && (
              <svg
                viewBox="0 0 60 18"
                className="w-14 h-4 opacity-70 group-hover:opacity-100 transition-opacity"
              >
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="currentColor"
                  className={iconMap[accent] || iconMap.green}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
            {label}
          </p>
        </div>
        <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium truncate max-w-[100px]">{subValue}</span>
          <span className="text-gray-500 truncate text-right">
            {subLabel}
            <span className="text-white font-semibold ml-0.5">{subLabelVal}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
