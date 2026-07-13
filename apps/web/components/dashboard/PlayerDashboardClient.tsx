'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import {
  CalendarCheck,
  Clock,
  Heart,
  DollarSign,
  Plus,
  Compass,
  MapPin,
  Star,
  ChevronRight,
  ArrowRight,
  History,
  Car,
  Wifi,
  Zap,
  X,
} from 'lucide-react'

import { StatCard } from '@/components/ui/StatCard'

// Simple helper to format time
function formatRelativeTime(dateStr: string) {
  const dateObj = new Date(dateStr)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - dateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 1) return 'Yesterday'
  if (diffDays <= 7) return 'Last Week'
  if (diffDays <= 14) return '2 Weeks Ago'
  return `${diffDays} days ago`
}

// Custom Counter hook for animated counters
function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = 0
    const end = value
    if (start === end) {
      setCount(end)
      return
    }

    const duration = 1000 // 1s animation duration
    const steps = 30 // 30 updates
    const increment = Math.ceil(end / steps)
    const stepTime = Math.floor(duration / steps)

    let current = start
    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(current)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  return <span>{count}</span>
}

interface PlayerDashboardClientProps {
  displayName: string
  profileImageUrl?: string
  email: string
  totalBookings: number
  upcomingBookingsCount: number
  totalFavorites: number
  totalSpent: number
  upcomingList: any[]
  pastList: any[]
  venues: any[]
}

export function PlayerDashboardClient({
  displayName,
  profileImageUrl,
  email,
  totalBookings,
  upcomingBookingsCount,
  totalFavorites,
  totalSpent,
  upcomingList,
  pastList,
  venues,
}: PlayerDashboardClientProps) {
  const [greeting, setGreeting] = useState('Good evening')
  const [draftBooking, setDraftBooking] = useState<any | null>(null)
  const [dismissedDraft, setDismissedDraft] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuthStore()
  const avatarUrl = user?.logoUrl || profileImageUrl

  // Real-time Supabase database listener for updates on bookings & favorites
  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Compute Greeting based on local time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Check for local storage draft bookings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tg_draft_booking')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Expire draft bookings older than 2 hours to keep it relevant
          if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
            setDraftBooking(parsed)
          } else {
            localStorage.removeItem('tg_draft_booking')
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  // Dynamic gamification mock parameters (based on actual user bookings to make it live)
  const totalXp = totalBookings * 250
  const level = Math.min(50, 1 + Math.floor(totalXp / 1000))
  const league =
    level >= 41
      ? 'Legendary League'
      : level >= 31
        ? 'Master League'
        : level >= 21
          ? 'Pro League'
          : level >= 11
            ? 'Semi-Pro League'
            : 'Amateur League'
  const xp = totalXp % 1000
  const xpTarget = 1000

  // Calculate upcoming countdown
  const nextBooking = upcomingList[0] || null
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!nextBooking || !nextBooking.slots) return

    const updateCountdown = () => {
      const slotTime = new Date(nextBooking.slots.start_time).getTime()
      const now = Date.now()
      const diff = slotTime - now

      if (diff <= 0) {
        setCountdown('Starts now')
        return
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hrs > 24) {
        setCountdown(`In ${Math.ceil(hrs / 24)} days`)
      } else if (hrs > 0) {
        setCountdown(`Starts in ${hrs}h ${mins}m`)
      } else {
        setCountdown(`Starts in ${mins}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [nextBooking])

  return (
    <div className="p-8 space-y-8 w-full">
      {/* 1. HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-white/8 bg-gradient-to-br from-green-950/20 via-black to-[#050805] p-6 md:p-8 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(34,197,94,0.08),transparent_50%)] pointer-events-none" />

        {/* Left Side: Avatar, Greeting, Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10 w-full lg:max-w-2xl">
          {/* Avatar with Glow */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f240f] to-green-950 border border-green-500/30 flex items-center justify-center text-xl font-bold text-green-400 relative overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-[10px] font-bold text-black shadow-lg">
              {level}
            </div>
          </div>

          {/* Greeting and Progress Bar */}
          <div className="space-y-3 flex-1 w-full">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
                {greeting}, {displayName.split(' ')[0]} 👋
              </h1>
              <p className="text-gray-400 mt-1 text-sm">Ready for your next innings?</p>
            </div>

            {/* Level Progress */}
            <div className="pt-2 max-w-sm">
              <div className="flex justify-between items-end text-xs font-semibold mb-1">
                <span className="text-green-400 tracking-wide uppercase">
                  Level {level} · {league}
                </span>
                <span className="text-gray-400">
                  {xp}/{xpTarget} XP
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(xp / xpTarget) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action CTA Buttons */}
        <div className="flex gap-3 relative z-10 w-full sm:w-auto">
          <Link
            href="/venues"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-lg hover:shadow-green-500/20 active:scale-98"
          >
            <Plus className="w-4 h-4" /> Book Turf
          </Link>
          <Link
            href="/player/favorites"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/8 text-sm font-semibold transition-all active:scale-98"
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500/20" /> My Favorites
          </Link>
        </div>
      </motion.div>

      {/* 2. CONTINUE BOOKING WIDGET */}
      <AnimatePresence>
        {draftBooking && !dismissedDraft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-950/20 to-black p-5 flex items-center justify-between gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 flex-shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-400 tracking-wider uppercase">
                    Continue Where You Left Off
                  </p>
                  <h3 className="font-bold text-white text-base mt-0.5">
                    Continue Booking {draftBooking.venueName}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {draftBooking.slotDate} · {draftBooking.slotTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/venues/${draftBooking.venueId}`}
                  className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold transition-all hover:bg-green-400 flex items-center gap-1.5"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('tg_draft_booking')
                    setDismissedDraft(true)
                  }}
                  className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. STAT CARDS */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <StatCard
            label="Total Spent"
            value={
              <span className="flex items-baseline font-sans font-extrabold text-white text-2xl">
                <span className="text-gray-400 mr-0.5 text-lg font-bold">₹</span>
                <AnimatedNumber value={totalSpent} />
              </span>
            }
            change="+0%"
            trend="up"
            accent="green"
            icon={<DollarSign className="w-5 h-5" />}
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <StatCard
            label="Total Bookings"
            value={
              <span className="font-sans font-extrabold text-white text-2xl">
                <AnimatedNumber value={totalBookings} />
              </span>
            }
            change="+0%"
            trend="up"
            accent="blue"
            icon={<CalendarCheck className="w-5 h-5" />}
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <StatCard
            label="Upcoming Match"
            value={
              <span className="font-sans font-extrabold text-white text-2xl">
                <AnimatedNumber value={upcomingBookingsCount} />
              </span>
            }
            change="0.0"
            trend="up"
            accent="amber"
            icon={<Clock className="w-5 h-5" />}
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <StatCard
            label="Favorite Turfs"
            value={
              <span className="font-sans font-extrabold text-white text-2xl">
                <AnimatedNumber value={totalFavorites} />
              </span>
            }
            change="+0%"
            trend="up"
            accent="purple"
            icon={<Heart className="w-5 h-5" />}
          />
        </motion.div>
      </motion.div>

      {/* MID-GRID: UPCOMING MATCH & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* UPCOMING MATCH ("Your Next Innings") */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Upcoming Match</h2>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 h-[220px] flex flex-col justify-center relative overflow-hidden">
            {!nextBooking ? (
              <div className="text-center space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mx-auto text-green-400">
                  <span className="text-2xl leading-none">🏏</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">No Match Scheduled</h3>
                  <p className="text-xs text-gray-400 mt-1">Ready to play?</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/venues"
                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold transition-all"
                  >
                    Explore Turf
                  </Link>
                  <Link
                    href="/player/bookings"
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-white text-xs font-semibold transition-all hover:bg-white/10"
                  >
                    View History
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                      Confirmed Pitch
                    </span>
                    {countdown && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1 font-medium bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/10">
                        <Clock className="w-3 h-3" /> {countdown}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {nextBooking.venues?.name || 'Venue'}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />{' '}
                      {nextBooking.venues?.address || 'Unknown address'}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs font-mono text-gray-300">
                    <div className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-sans">Date</p>
                      <p className="font-semibold mt-0.5">
                        {new Date(nextBooking.slots.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase font-sans">Time Slot</p>
                      <p className="font-semibold mt-0.5">
                        {new Date(nextBooking.slots.start_time).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/player/bookings"
                  className="w-full md:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-green-500/20 transition-all font-semibold text-xs text-center block text-white"
                >
                  View Booking
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 h-[220px]">
            {[
              { label: 'Book a Turf', desc: 'Find boxes & reserve', href: '/venues', icon: Plus },
              {
                label: 'View My Bookings',
                desc: 'Manage your matches',
                href: '/player/bookings',
                icon: Clock,
              },
              {
                label: 'My Favorites',
                desc: 'View your saved venues',
                href: '/player/favorites',
                icon: Heart,
              },
            ].map((act) => {
              const ActIcon = act.icon
              return (
                <Link
                  key={act.label}
                  href={act.href}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] p-4 group transition-all duration-300 focus:outline-none focus:border-green-500/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-gray-400 group-hover:text-green-400 group-hover:border-green-500/30 transition-all">
                      <ActIcon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-white font-bold text-sm group-hover:text-green-400 transition-colors">
                        {act.label}
                      </h4>
                      <p className="text-[10px] text-gray-500">{act.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* LOWER GRID: RECENT ACTIVITY TIMELINE & NEARBY TURFS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT ACTIVITY TIMELINE */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide">Recent Activity</h2>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 h-[400px] overflow-y-auto">
            {pastList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                <History className="w-8 h-8 text-gray-600" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="relative border-l border-white/10 pl-6 space-y-6">
                {pastList.slice(0, 4).map((act) => {
                  const isCancelled = act.status === 'CANCELLED'
                  const venueName = act.venues?.name || 'Venue'
                  const statusColor = isCancelled ? 'bg-red-500' : 'bg-green-500'

                  return (
                    <div key={act.id} className="relative group">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[30px] top-1.5 w-2 h-2 rounded-full ring-4 ring-[#060d06] ${statusColor}`}
                      />

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-500 block">
                          {formatRelativeTime(act.slots?.date || new Date())}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {isCancelled
                            ? `Cancelled booking at ${venueName}`
                            : `Played at ${venueName}`}
                        </h4>
                        <div className="h-px bg-white/5 my-2 w-full" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* NEARBY TURFS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white tracking-wide">Nearby Turfs</h2>
            <Link
              href="/venues"
              className="text-xs text-green-400 hover:text-green-300 font-semibold flex items-center gap-1"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {venues.slice(0, 2).map((v) => {
              // Map live details with fallback
              const rating = v.rating || (4.5 + (v.id.charCodeAt(0) % 5) * 0.1).toFixed(1)
              const distance = (1.2 + (v.id.charCodeAt(1) % 4) * 0.5).toFixed(1)
              const slotsCount =
                v.slotsCount !== undefined ? v.slotsCount : 3 + (v.id.charCodeAt(2) % 6)
              const price = Array.isArray(v.venue_pricing)
                ? v.venue_pricing[0]?.price
                : v.venue_pricing?.price || 1000

              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-all overflow-hidden flex flex-col h-[400px] group hover:shadow-xl hover:shadow-black/40"
                >
                  <div className="h-44 relative overflow-hidden bg-black/40">
                    <img
                      src={
                        v.image ||
                        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop'
                      }
                      alt={v.name}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    {/* Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 text-[10px] font-bold">
                      Open Now
                    </span>

                    <span className="absolute bottom-3 right-3 text-white text-sm font-extrabold font-mono">
                      ₹{price}
                      <span className="text-gray-400 text-[10px] font-normal">/hr</span>
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-green-400 transition-colors line-clamp-1">
                        {v.name}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-gray-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-green-400 shrink-0" />{' '}
                          {v.areas?.name ||
                            v.cities?.name ||
                            v.address?.split(',')[4]?.trim() ||
                            v.address?.split(',')[0] ||
                            'Tadepalligudem'}{' '}
                          ({distance} km)
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-yellow-400">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" /> {rating}
                        </span>
                        <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-gray-400">
                          {slotsCount} Slots Left
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center flex-wrap pt-1 text-[10px] text-gray-400">
                      {Array.isArray(v.amenities) && v.amenities.length > 0 ? (
                        v.amenities.slice(0, 3).map((amenity: string) => {
                          const lower = amenity.toLowerCase()
                          let IconComp = Zap
                          if (lower.includes('park')) IconComp = Car
                          else if (lower.includes('wifi') || lower.includes('internet'))
                            IconComp = Wifi

                          return (
                            <span
                              key={amenity}
                              className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md"
                            >
                              <IconComp className="w-3 h-3 text-green-400" />{' '}
                              {amenity.replace(' Available', '')}
                            </span>
                          )
                        })
                      ) : (
                        <>
                          <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                            <Car className="w-3 h-3 text-green-400" /> Parking
                          </span>
                          <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                            <Wifi className="w-3 h-3 text-green-400" /> WiFi
                          </span>
                          <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                            <Zap className="w-3 h-3 text-green-400" /> Lights
                          </span>
                        </>
                      )}
                    </div>

                    <Link
                      href={`/venues/${v.id}`}
                      className="block w-full py-2.5 rounded-xl bg-white/5 hover:bg-green-500 hover:text-black border border-white/8 hover:border-green-500 text-white transition-all text-xs font-bold text-center mt-2 active:scale-98"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              )
            })}
            {venues.length === 1 && (
              <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.01] hover:border-white/15 transition-all p-5 flex flex-col items-center justify-center text-center space-y-4 h-[400px]">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-green-400">
                  <span className="text-xl">🏏</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">More Venues Coming Soon</h4>
                  <p className="text-[11px] text-gray-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
                    We are onboarding more premium boxes in Hyderabad. Stay tuned!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
