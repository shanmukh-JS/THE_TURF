'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  TrendingUp,
  CalendarCheck,
  Star,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  MapPin,
  CalendarDays,
  DollarSign,
  ArrowRight,
  Timer,
  Lightbulb,
  BarChart3,
  Settings2,
  Eye,
  X,
} from 'lucide-react'

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  CONFIRMED: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Confirmed',
  },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Pending' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
  COMPLETED: {
    icon: CheckCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Completed',
  },
}

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return count
}

export default function OwnerDashboardPage() {
  const supabase = createClient()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null)
  const [venueIds, setVenueIds] = useState<string[]>([])
  const [venues, setVenues] = useState<any[]>([])

  // Data state
  const [revenue, setRevenue] = useState(0)
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0)
  const [totalBookings, setTotalBookings] = useState(0)
  const [yesterdayBookings, setYesterdayBookings] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [uniqueCustomers, setUniqueCustomers] = useState(0)
  const [todayBookingsCount, setTodayBookingsCount] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todaySlots, setTodaySlots] = useState<any[]>([])
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [nextBookingMins, setNextBookingMins] = useState<number | null>(null)
  const [activeVenuesCount, setActiveVenuesCount] = useState(0)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

  // Greeting
  const [greeting, setGreeting] = useState('Good evening')
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Owner'

  // Animated counters
  const animRevenue = useAnimatedCounter(revenue)
  const animBookings = useAnimatedCounter(totalBookings)
  const animCustomers = useAnimatedCounter(uniqueCustomers)
  const animTodayRev = useAnimatedCounter(todayRevenue)

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    if (!user) return

    try {
      // 1. Get owner profile
      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }
      setOwnerProfileId(profile.id)

      // 2. Get venues
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name, verification_status')
        .eq('owner_id', profile.id)

      if (!venuesData || venuesData.length === 0) {
        setLoading(false)
        return
      }

      setVenues(venuesData)
      const vIds = venuesData.map((v) => v.id)
      setVenueIds(vIds)
      setActiveVenuesCount(
        venuesData.filter((v) => v.verification_status === 'APPROVED').length || venuesData.length
      )

      // 3. Get all bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select(
          `
          id, total_amount, status, customer_id, venue_id, created_at,
          slot:slots(date, start_time, end_time),
          venue:venues(name)
        `
        )
        .in('venue_id', vIds)
        .order('created_at', { ascending: false })

      if (!bookings) {
        setLoading(false)
        return
      }

      // Customer names
      const customerIds = Array.from(new Set(bookings.map((b) => b.customer_id))).filter(Boolean)
      const customerMap = new Map<string, string>()

      if (customerIds.length > 0) {
        const { data: customerProfiles } = await supabase
          .from('customer_profiles')
          .select('user_id, full_name')
          .in('user_id', customerIds as string[])

        if (customerProfiles) {
          customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
        }
      }

      // Compute stats
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      let revSum = 0
      let yRevSum = 0
      let tRevSum = 0
      let tBookCount = 0
      let yBookCount = 0
      const customers = new Set<string>()
      let nearestBookingMins: number | null = null

      const recentList: any[] = []

      for (const b of bookings as any[]) {
        customers.add(b.customer_id)

        if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
          revSum += Number(b.total_amount)
        }

        const slot = b.slot && !Array.isArray(b.slot) ? b.slot : null
        const slotDate = slot?.date || ''

        // Today's stats
        if (slotDate === todayStr && (b.status === 'CONFIRMED' || b.status === 'COMPLETED')) {
          tBookCount++
          tRevSum += Number(b.total_amount)

          // Next booking
          if (slot?.start_time) {
            const startTime = new Date(slot.start_time)
            const diffMins = Math.round((startTime.getTime() - now.getTime()) / 60000)
            if (diffMins > 0 && (nearestBookingMins === null || diffMins < nearestBookingMins)) {
              nearestBookingMins = diffMins
            }
          }
        }

        // Yesterday's stats
        if (slotDate === yesterdayStr && (b.status === 'CONFIRMED' || b.status === 'COMPLETED')) {
          yBookCount++
          yRevSum += Number(b.total_amount)
        }

        // Recent bookings (top 5)
        if (recentList.length < 5) {
          let timeStr = 'N/A'
          let dateStr = 'N/A'
          if (slot) {
            const d = new Date(slot.date)
            dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (slot.start_time) {
              timeStr = new Date(slot.start_time).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
              })
            }
          }
          recentList.push({
            id: b.id,
            customer: customerMap.get(b.customer_id) || 'Customer',
            venue: b.venue && !Array.isArray(b.venue) ? b.venue.name : 'Unknown Venue',
            date: dateStr,
            time: timeStr,
            amount: Number(b.total_amount),
            status: b.status || 'PENDING',
          })
        }
      }

      setRevenue(revSum)
      setYesterdayRevenue(yRevSum)
      setTotalBookings(bookings.length)
      setYesterdayBookings(yBookCount)
      setUniqueCustomers(customers.size)
      setTodayBookingsCount(tBookCount)
      setTodayRevenue(tRevSum)
      setNextBookingMins(nearestBookingMins)
      setRecentBookings(recentList)

      // 4. Ratings
      const { data: reviews } = await supabase.from('reviews').select('rating').in('venue_id', vIds)

      if (reviews && reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + Number(r.rating), 0)
        setAvgRating(Number((sum / reviews.length).toFixed(1)))
        setTotalReviews(reviews.length)
      }

      // 5. Today's Slots (all, not just 4)
      const { data: tSlots } = await supabase
        .from('slots')
        .select('id, start_time, end_time, is_booked, status, venue_id')
        .in('venue_id', vIds)
        .eq('date', todayStr)
        .order('start_time', { ascending: true })

      if (tSlots) {
        const formatted = tSlots.map((s) => {
          const time = new Date(s.start_time).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          })

          let customerName = ''
          if (s.is_booked) {
            const booking = (bookings as any[]).find(
              (b: any) => b.status === 'CONFIRMED' && b.slot?.start_time === s.start_time
            )
            if (booking) {
              customerName = customerMap.get(booking.customer_id) || 'Booked'
            } else {
              customerName = 'Booked'
            }
          }

          const venueName = venuesData.find((v) => v.id === s.venue_id)?.name || ''

          return {
            id: s.id,
            time,
            customer: s.is_booked ? customerName : '',
            status: s.status === 'Blocked' ? 'blocked' : s.is_booked ? 'booked' : 'available',
            venueName,
          }
        })
        setTodaySlots(formatted)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchDashboardData()
  }, [user])

  // Real-time subscription
  useEffect(() => {
    if (!ownerProfileId || venueIds.length === 0) return

    const channel = supabase
      .channel('owner-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () =>
        fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `owner_id=eq.${ownerProfileId}` },
        () => fetchDashboardData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerProfileId, venueIds])

  // Business insight generation (data-driven)
  const insight = useMemo(() => {
    if (loading) return null

    const todayOccupancy =
      todaySlots.length > 0
        ? Math.round(
            (todaySlots.filter((s) => s.status === 'booked').length / todaySlots.length) * 100
          )
        : 0

    const eveningSlots = todaySlots.filter((s) => {
      const hour = parseInt(s.time.split(':')[0])
      const isPM = s.time.includes('PM')
      const h24 = isPM && hour !== 12 ? hour + 12 : hour
      return h24 >= 17
    })
    const eveningBooked = eveningSlots.filter((s) => s.status === 'booked').length
    const eveningOccupancy =
      eveningSlots.length > 0 ? Math.round((eveningBooked / eveningSlots.length) * 100) : 0

    if (todayOccupancy >= 80)
      return { text: `Today's occupancy is at ${todayOccupancy}%. Great day!`, type: 'positive' }
    if (eveningOccupancy >= 75)
      return {
        text: `Evening slots are ${eveningOccupancy}% full. Peak demand detected.`,
        type: 'positive',
      }
    if (revenue > 0 && todayRevenue > (yesterdayRevenue || 1))
      return { text: `Today's revenue is trending above yesterday. Keep it up!`, type: 'positive' }
    if (todayOccupancy < 30 && todaySlots.length > 0)
      return {
        text: `Only ${todayOccupancy}% slots filled today. Consider running a promotion.`,
        type: 'attention',
      }
    if (avgRating >= 4.5)
      return {
        text: `Your ${avgRating}★ rating is excellent. Customers love your venues!`,
        type: 'positive',
      }
    if (totalReviews === 0)
      return {
        text: 'No reviews yet. Encourage customers to leave feedback after bookings.',
        type: 'neutral',
      }
    return {
      text: `You have ${uniqueCustomers} unique customers. Focus on repeat visits!`,
      type: 'neutral',
    }
  }, [
    loading,
    todaySlots,
    revenue,
    todayRevenue,
    yesterdayRevenue,
    avgRating,
    totalReviews,
    uniqueCustomers,
  ])

  // Revenue comparison
  const revenueChange = useMemo(() => {
    if (yesterdayRevenue === 0) return { text: '+0%', trend: 'up' as const }
    const pct = Math.round(((revenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    return {
      text: `${pct >= 0 ? '+' : ''}${pct}%`,
      trend: pct >= 0 ? ('up' as const) : ('down' as const),
    }
  }, [revenue, yesterdayRevenue])

  const bookingsChange = useMemo(() => {
    if (yesterdayBookings === 0) return '+0%'
    const pct = Math.round(((todayBookingsCount - yesterdayBookings) / yesterdayBookings) * 100)
    return `${pct >= 0 ? '+' : ''}${pct}%`
  }, [todayBookingsCount, yesterdayBookings])

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        {/* Skeleton Hero */}
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-7 w-64 bg-white/5 rounded-lg" />
            <div className="h-5 w-96 bg-white/5 rounded-lg" />
          </div>
          <div className="h-10 w-40 bg-white/5 rounded-xl" />
        </div>
        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/8" />
          ))}
        </div>
        {/* Skeleton Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-white/[0.03] border border-white/8" />
          <div className="h-96 rounded-2xl bg-white/[0.03] border border-white/8" />
        </div>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION - Premium Greeting + Business Summary
         ═══════════════════════════════════════════════════════════════ */}
      <DashboardAnimationItem>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {firstName} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-green-400" />
                <span className="text-white font-medium">{todayBookingsCount}</span> bookings today
              </span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
                <span className="text-white font-medium">
                  ₹{todayRevenue.toLocaleString('en-IN')}
                </span>{' '}
                earned today
              </span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-green-400" />
                {nextBookingMins !== null ? (
                  <>
                    Next booking in{' '}
                    <span className="text-white font-medium">
                      {nextBookingMins < 60
                        ? `${nextBookingMins} min`
                        : `${Math.floor(nextBookingMins / 60)}h ${nextBookingMins % 60}m`}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">No upcoming bookings</span>
                )}
              </span>
            </div>
          </div>

          {/* Venue Status Badge */}
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 px-5 py-2.5 rounded-xl shrink-0">
            <div
              className={`w-2 h-2 rounded-full ${activeVenuesCount > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
            />
            <span
              className={`${activeVenuesCount > 0 ? 'text-green-400' : 'text-gray-400'} text-sm font-medium`}
            >
              {activeVenuesCount} {activeVenuesCount === 1 ? 'Venue' : 'Venues'} Active
            </span>
          </div>
        </div>
      </DashboardAnimationItem>

      {/* ═══════════════════════════════════════════════════════════════
          STAT CARDS - Animated counters + comparisons
         ═══════════════════════════════════════════════════════════════ */}
      <DashboardAnimationItem className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCardEnhanced
          label="Total Revenue"
          value={`₹${animRevenue.toLocaleString('en-IN')}`}
          change={revenueChange.text}
          trend={revenueChange.trend}
          subLabel="vs yesterday"
          accent="green"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCardEnhanced
          label="Total Bookings"
          value={animBookings.toString()}
          change={bookingsChange}
          trend={todayBookingsCount >= yesterdayBookings ? 'up' : 'down'}
          subLabel="today vs yesterday"
          accent="blue"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCardEnhanced
          label="Avg. Rating"
          value={avgRating > 0 ? `${avgRating} ★` : '—'}
          change={totalReviews > 0 ? `${totalReviews} reviews` : ''}
          trend="up"
          subLabel=""
          accent="amber"
          icon={<Star className="w-5 h-5" />}
        />
        <StatCardEnhanced
          label="Unique Customers"
          value={animCustomers.toString()}
          change=""
          trend="up"
          subLabel="all time"
          accent="purple"
          icon={<Users className="w-5 h-5" />}
        />
      </DashboardAnimationItem>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT - 3-column layout
         ═══════════════════════════════════════════════════════════════ */}
      <DashboardAnimationItem className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Recent Bookings (2 cols) ─── */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
            <Link
              href="/owner/bookings"
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[320px] text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
                  <CalendarCheck className="w-7 h-7 text-green-400/60" />
                </div>
                <p className="text-white font-medium text-sm">No bookings yet</p>
                <p className="text-gray-500 text-xs mt-1.5 max-w-xs">
                  When customers book your venues, they'll appear here. Start by creating slots for
                  your venue.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                      Date & Time
                    </th>
                    <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs text-gray-500 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentBookings.map((b) => {
                    const s = (statusConfig[b.status] || statusConfig.PENDING) as {
                      icon: any
                      color: string
                      bg: string
                      label: string
                    }
                    const StatusIcon = s.icon
                    return (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-600/30 flex items-center justify-center text-xs font-bold text-green-300 flex-shrink-0">
                              {b.customer.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{b.customer}</p>
                              <p className="text-xs text-gray-500">{b.venue}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-300">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {b.date} · {b.time}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-white">
                            ₹{b.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color} ${s.bg}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── Right Column: Today's Schedule + Business Center ─── */}
        <div className="space-y-6">
          {/* Today's Schedule Timeline */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Today&apos;s Schedule</h2>
              <Link
                href="/owner/slots"
                className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
              >
                View all →
              </Link>
            </div>

            {todaySlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No slots scheduled for today.</p>
                <Link
                  href="/owner/slots"
                  className="text-xs text-green-400 hover:text-green-300 mt-2 inline-block font-medium"
                >
                  + Create Slots
                </Link>
              </div>
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                {todaySlots.slice(0, 8).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 group">
                    {/* Time */}
                    <span className="text-[11px] font-mono text-gray-500 w-[68px] shrink-0">
                      {s.time}
                    </span>

                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full border-2 ${
                          s.status === 'booked'
                            ? 'border-green-400 bg-green-400/30'
                            : s.status === 'blocked'
                              ? 'border-amber-400 bg-amber-400/30'
                              : 'border-gray-600 bg-gray-600/30'
                        }`}
                      />
                      {i < Math.min(todaySlots.length, 8) - 1 && (
                        <div className="w-[1px] h-6 bg-white/10" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                        s.status === 'booked'
                          ? 'bg-green-500/10 text-green-300 border border-green-500/15'
                          : s.status === 'blocked'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/15'
                            : 'bg-white/[0.03] text-gray-500 border border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          {s.status === 'booked'
                            ? s.customer
                            : s.status === 'blocked'
                              ? 'Blocked'
                              : 'Available'}
                        </span>
                        {s.venueName && (
                          <span className="text-[10px] opacity-60">{s.venueName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {todaySlots.length > 8 && (
                  <Link
                    href="/owner/slots"
                    className="block text-center text-xs text-green-400 hover:text-green-300 pt-2 font-medium"
                  >
                    +{todaySlots.length - 8} more slots →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Business Center */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Business Center</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Create Slots',
                  icon: Plus,
                  href: '/owner/slots',
                  color: 'text-green-400 bg-green-500/10 border-green-500/15 hover:bg-green-500/20',
                },
                {
                  label: 'Add Venue',
                  icon: MapPin,
                  href: '/owner/venues/new',
                  color: 'text-blue-400 bg-blue-500/10 border-blue-500/15 hover:bg-blue-500/20',
                },
                {
                  label: 'Revenue',
                  icon: BarChart3,
                  href: '/owner/revenue',
                  color: 'text-amber-400 bg-amber-500/10 border-amber-500/15 hover:bg-amber-500/20',
                },
                {
                  label: 'Settings',
                  icon: Settings2,
                  href: '/owner/settings',
                  color:
                    'text-purple-400 bg-purple-500/10 border-purple-500/15 hover:bg-purple-500/20',
                },
              ].map((a) => {
                const Icon = a.icon
                return (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${a.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-semibold">{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </DashboardAnimationItem>

      {/* ═══════════════════════════════════════════════════════════════
          BUSINESS INSIGHT WIDGET
         ═══════════════════════════════════════════════════════════════ */}
      {insight && (
        <DashboardAnimationItem>
          <div
            className={`rounded-2xl border p-4 flex items-center gap-4 ${
              insight.type === 'positive'
                ? 'border-green-500/15 bg-green-500/5'
                : insight.type === 'attention'
                  ? 'border-amber-500/15 bg-amber-500/5'
                  : 'border-white/8 bg-white/[0.02]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                insight.type === 'positive'
                  ? 'bg-green-500/15'
                  : insight.type === 'attention'
                    ? 'bg-amber-500/15'
                    : 'bg-white/5'
              }`}
            >
              <Lightbulb
                className={`w-5 h-5 ${
                  insight.type === 'positive'
                    ? 'text-green-400'
                    : insight.type === 'attention'
                      ? 'text-amber-400'
                      : 'text-gray-400'
                }`}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                Business Insight
              </p>
              <p className="text-sm text-white/90">{insight.text}</p>
            </div>
          </div>
        </DashboardAnimationItem>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          BOOKING DETAIL DRAWER
         ═══════════════════════════════════════════════════════════════ */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0a0f0a] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-lg font-bold text-green-400">
                  {selectedBooking.customer.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{selectedBooking.customer}</p>
                  <p className="text-sm text-gray-500">{selectedBooking.venue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoBlock label="Date" value={selectedBooking.date} />
                <InfoBlock label="Time" value={selectedBooking.time} />
                <InfoBlock
                  label="Amount"
                  value={`₹${selectedBooking.amount.toLocaleString('en-IN')}`}
                />
                <InfoBlock label="Status" value={selectedBooking.status} />
              </div>

              <div className="pt-4 border-t border-white/8 space-y-3">
                <Link
                  href="/owner/bookings"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-black font-semibold text-sm hover:bg-green-400 transition-all"
                  onClick={() => setSelectedBooking(null)}
                >
                  <CalendarDays className="w-4 h-4" /> View All Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/8 p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function StatCardEnhanced({
  label,
  value,
  change,
  trend,
  subLabel,
  accent,
  icon,
}: {
  label: string
  value: React.ReactNode
  change: string
  trend: 'up' | 'down'
  subLabel: string
  accent: string
  icon: React.ReactNode
}) {
  const accentMap: Record<string, string> = {
    green:
      'from-green-500/10 to-emerald-500/5 border-green-500/20 hover:border-green-500/50 hover:from-green-500/20',
    blue: 'from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/50 hover:from-blue-500/20',
    amber:
      'from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-500/50 hover:from-amber-500/20',
    purple:
      'from-purple-500/10 to-violet-500/5 border-purple-500/20 hover:border-purple-500/50 hover:from-purple-500/20',
  }
  const iconMap: Record<string, string> = {
    green:
      'bg-green-500/15 text-green-400 group-hover:bg-green-500/25 group-hover:scale-110 transition-all duration-300',
    blue: 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 group-hover:scale-110 transition-all duration-300',
    amber:
      'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 group-hover:scale-110 transition-all duration-300',
    purple:
      'bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25 group-hover:scale-110 transition-all duration-300',
  }
  const blobColorMap: Record<string, string> = {
    green: 'bg-green-500 group-hover:shadow-[0_0_40px_15px_rgba(34,197,94,0.3)]',
    blue: 'bg-blue-500 group-hover:shadow-[0_0_40px_15px_rgba(59,130,246,0.3)]',
    amber: 'bg-amber-500 group-hover:shadow-[0_0_40px_15px_rgba(245,158,11,0.3)]',
    purple: 'bg-purple-500 group-hover:shadow-[0_0_40px_15px_rgba(168,85,247,0.3)]',
  }

  return (
    <div
      className={`group relative rounded-2xl border bg-gradient-to-br p-5 overflow-hidden transition-all duration-300 ease-out hover:-translate-y-[3px] hover:shadow-xl hover:shadow-black/40 ${accentMap[accent]}`}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconMap[accent]}`}
          >
            {icon}
          </div>
          {change && (
            <div className="text-right">
              <span
                className={`text-xs font-semibold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}
              >
                {trend === 'up' ? '▲' : '▼'} {change}
              </span>
              {subLabel && <p className="text-[10px] text-gray-500 mt-0.5">{subLabel}</p>}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-sm text-gray-400 mt-1">{label}</p>
      </div>
      <div
        className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.03] z-0 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[8] group-hover:opacity-[0.08] ${blobColorMap[accent] || 'bg-current'}`}
      />
    </div>
  )
}
