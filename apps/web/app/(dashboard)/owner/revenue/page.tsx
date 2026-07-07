'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  CalendarDays,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react'

export default function OwnerRevenuePage() {
  const supabase = createClient()
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [pendingRevenue, setPendingRevenue] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [weeklyRevenue, setWeeklyRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [avgBookingValue, setAvgBookingValue] = useState(0)
  const [topVenue, setTopVenue] = useState<string | null>(null)
  const [topVenueRevenue, setTopVenueRevenue] = useState(0)
  const [peakHour, setPeakHour] = useState<string | null>(null)
  const [peakDay, setPeakDay] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [venueIds, setVenueIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchRevenue() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const isAdmin = userData?.role === 'ADMIN'

      let venues: any[] = []
      if (isAdmin) {
        const { data: allVenues } = await supabase.from('venues').select('id, name')
        venues = allVenues || []
      } else {
        const { data: profile } = await supabase
          .from('owner_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          setLoading(false)
          return
        }

        const { data: ownerVenues } = await supabase
          .from('venues')
          .select('id, name')
          .eq('owner_id', profile.id)

        venues = ownerVenues || []
      }

      if (venues.length === 0) {
        setLoading(false)
        return
      }

      const vIds = venues.map((v) => v.id)
      setVenueIds(vIds)
      const venueMap = new Map(venues.map((v) => [v.id, v.name]))

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(
          `
          id, 
          total_amount, 
          status, 
          customer_id,
          venue_id,
          created_at,
          slots(date, start_time)
        `
        )
        .in('venue_id', vIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching revenue data:', error)
        setLoading(false)
        return
      }

      if (bookings && bookings.length > 0) {
        const customerIds = Array.from(new Set(bookings.map((b) => b.customer_id)))

        let customerMap = new Map<string, string>()
        if (isAdmin) {
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', customerIds as string[])
          if (users) {
            users.forEach((u) => customerMap.set(u.id, u.email.split('@')[0]))
          }
          const { data: cp } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])
          if (cp) {
            cp.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }
        } else {
          const { data: customerProfiles } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])
          if (customerProfiles) {
            customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }
        }

        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        const monthAgo = new Date(now)
        monthAgo.setDate(monthAgo.getDate() - 30)

        let totalRev = 0
        let pendingRev = 0
        let tRev = 0
        let wRev = 0
        let mRev = 0
        let confirmedCount = 0

        // Venue revenue tracker
        const venueRevMap = new Map<string, number>()
        // Hour tracker
        const hourMap = new Map<number, number>()
        // Day tracker
        const dayMap = new Map<number, number>()
        // Daily revenue for sparkline (last 7 days)
        const dailyRevMap = new Map<string, number>()

        bookings.forEach((b: any) => {
          const slot = b.slots && !Array.isArray(b.slots) ? b.slots : null
          const amount = Number(b.total_amount)

          if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
            totalRev += amount
            confirmedCount++

            // Per venue
            const currentVenueRev = venueRevMap.get(b.venue_id) || 0
            venueRevMap.set(b.venue_id, currentVenueRev + amount)

            // Today
            const slotDate = slot?.date || ''
            if (slotDate === todayStr) tRev += amount

            // Weekly & Monthly
            const createdDate = new Date(b.created_at)
            if (createdDate >= weekAgo) wRev += amount
            if (createdDate >= monthAgo) mRev += amount

            // Peak hour
            if (slot?.start_time) {
              const hour = new Date(slot.start_time).getHours()
              hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
            }

            // Peak day
            if (slotDate) {
              const dayOfWeek = new Date(slotDate).getDay()
              dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) || 0) + 1)
            }

            // Daily revenue (last 7 days)
            if (createdDate >= weekAgo) {
              const dateKey = createdDate.toISOString().split('T')[0] as string
              dailyRevMap.set(dateKey, (dailyRevMap.get(dateKey) || 0) + amount)
            }
          } else if (b.status === 'PENDING') {
            pendingRev += amount
          }
        })

        setTotalRevenue(totalRev)
        setPendingRevenue(pendingRev)
        setTodayRevenue(tRev)
        setWeeklyRevenue(wRev)
        setMonthlyRevenue(mRev)
        setAvgBookingValue(confirmedCount > 0 ? Math.round(totalRev / confirmedCount) : 0)

        // Top venue
        let maxRev = 0
        let topVenueId = ''
        venueRevMap.forEach((rev, vid) => {
          if (rev > maxRev) { maxRev = rev; topVenueId = vid }
        })
        if (topVenueId) {
          setTopVenue(venueMap.get(topVenueId) || null)
          setTopVenueRevenue(maxRev)
        }

        // Peak hour
        let maxHourCount = 0
        let peakH = -1
        hourMap.forEach((count, hour) => {
          if (count > maxHourCount) { maxHourCount = count; peakH = hour }
        })
        if (peakH >= 0) {
          const ampm = peakH >= 12 ? 'PM' : 'AM'
          const h12 = peakH > 12 ? peakH - 12 : peakH === 0 ? 12 : peakH
          setPeakHour(`${h12}:00 ${ampm}`)
        }

        // Peak day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        let maxDayCount = 0
        let peakD = -1
        dayMap.forEach((count, day) => {
          if (count > maxDayCount) { maxDayCount = count; peakD = day }
        })
        if (peakD >= 0) setPeakDay(dayNames[peakD] || null)

        // Sparkline data (last 7 days)
        const spark: number[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const key = d.toISOString().split('T')[0] as string
          spark.push(dailyRevMap.get(key) || 0)
        }
        setDailyRevenue(spark)

        // Transactions
        const formattedTx = bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'COMPLETED')
          .slice(0, 15)
          .map((b: any) => {
            const dateStr = new Date(b.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const timeStr = new Date(b.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })

            return {
              id: b.id,
              customerName: customerMap.get(b.customer_id) || 'Unknown Customer',
              venueName: venueMap.get(b.venue_id) || 'Unknown Venue',
              date: dateStr,
              time: timeStr,
              amount: b.total_amount,
              status: b.status,
              type: b.status === 'PENDING' ? 'pending' : 'received',
            }
          })

        setTransactions(formattedTx)
      }

      setLoading(false)
    }

    fetchRevenue()
  }, [])

  // Real-time
  useEffect(() => {
    if (venueIds.length === 0) return
    const channel = supabase
      .channel('owner-revenue-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // Re-fetch on changes
        window.location.reload()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [venueIds])

  // Mini sparkline SVG
  const sparklinePath = useMemo(() => {
    if (dailyRevenue.length === 0) return ''
    const max = Math.max(...dailyRevenue, 1)
    const width = 200
    const height = 40
    const points = dailyRevenue.map((v, i) => {
      const x = (i / (dailyRevenue.length - 1)) * width
      const y = height - (v / max) * height
      return `${x},${y}`
    })
    return `M${points.join(' L')}`
  }, [dailyRevenue])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading revenue data...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem>
        <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Track your earnings, payouts, and financial insights.</p>
      </DashboardAnimationItem>

      {/* ═══ Revenue Summary Cards ═══ */}
      <DashboardAnimationItem className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <RevenueCard
          label="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString('en-IN')}`}
          icon={<DollarSign className="w-5 h-5" />}
          accent="green"
        />
        <RevenueCard
          label="This Week"
          value={`₹${weeklyRevenue.toLocaleString('en-IN')}`}
          icon={<CalendarDays className="w-5 h-5" />}
          accent="blue"
        />
        <RevenueCard
          label="This Month"
          value={`₹${monthlyRevenue.toLocaleString('en-IN')}`}
          icon={<BarChart3 className="w-5 h-5" />}
          accent="purple"
        />
        <RevenueCard
          label="Avg. Booking Value"
          value={`₹${avgBookingValue.toLocaleString('en-IN')}`}
          icon={<Target className="w-5 h-5" />}
          accent="amber"
        />
      </DashboardAnimationItem>

      {/* ═══ Financial Summary + Sparkline ═══ */}
      <DashboardAnimationItem className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-gray-400 font-medium">Total Earned</h3>
            </div>
            <p className="text-4xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
            {/* Sparkline */}
            {dailyRevenue.some((v) => v > 0) && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Last 7 days trend</p>
                <svg viewBox={`0 0 200 40`} className="w-full h-10" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(34,197,94)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="rgb(34,197,94)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparklinePath} fill="none" stroke="rgb(34,197,94)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={`${sparklinePath} L200,40 L0,40 Z`} fill="url(#sparkGrad)" />
                </svg>
              </div>
            )}
            <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" /> Real-time tracking
            </p>
          </div>
        </div>

        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-gray-400 font-medium">Pending Settlements</h3>
            </div>
            <p className="text-4xl font-bold text-white">
              ₹{pendingRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-amber-400 mt-2 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" /> Awaiting confirmation
            </p>
          </div>
        </div>
      </DashboardAnimationItem>

      {/* ═══ Insights Row ═══ */}
      <DashboardAnimationItem className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InsightCard
          label="Top Performing Venue"
          value={topVenue || '—'}
          sub={topVenue ? `₹${topVenueRevenue.toLocaleString('en-IN')} revenue` : 'No data yet'}
          icon={<Zap className="w-4 h-4 text-green-400" />}
        />
        <InsightCard
          label="Most Booked Time"
          value={peakHour || '—'}
          sub={peakHour ? 'Peak booking hour' : 'No data yet'}
          icon={<Clock className="w-4 h-4 text-blue-400" />}
        />
        <InsightCard
          label="Most Popular Day"
          value={peakDay || '—'}
          sub={peakDay ? 'Highest demand day' : 'No data yet'}
          icon={<CalendarDays className="w-4 h-4 text-purple-400" />}
        />
      </DashboardAnimationItem>

      {/* ═══ Transactions Table ═══ */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
          <span className="text-xs text-gray-500">{transactions.length} transactions</span>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
                <Wallet className="w-7 h-7 text-green-400/60" />
              </div>
              <p className="text-white font-medium">No transactions yet</p>
              <p className="text-gray-500 text-sm mt-1.5 max-w-xs">
                Completed payments will automatically appear here.
              </p>
            </div>
          ) : (
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Transaction
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Details
                  </th>
                  <th className="text-right px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-400 font-mono">#{t.id.split('-')[0]}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white">{t.date}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{t.customerName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.venueName}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={`text-sm font-bold ${t.type === 'received' ? 'text-green-400' : 'text-amber-400'}`}
                      >
                        +₹{t.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.status}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}

// ═══ Sub-components ═══

function RevenueCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: 'green' | 'blue' | 'purple' | 'amber' }) {
  const colorMap: Record<string, { border: string; iconBg: string; iconColor: string }> = {
    green: { border: 'border-green-500/20 hover:border-green-500/40', iconBg: 'bg-green-500/15', iconColor: 'text-green-400' },
    blue: { border: 'border-blue-500/20 hover:border-blue-500/40', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
    purple: { border: 'border-purple-500/20 hover:border-purple-500/40', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400' },
    amber: { border: 'border-amber-500/20 hover:border-amber-500/40', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
  }
  const c = (colorMap[accent] || colorMap.green) as { border: string; iconBg: string; iconColor: string }

  return (
    <div className={`rounded-2xl border bg-[#0a0f0a] p-5 transition-all hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/30 ${c.border}`}>
      <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconColor} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  )
}

function InsightCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-4 hover:border-white/15 transition-all">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}
