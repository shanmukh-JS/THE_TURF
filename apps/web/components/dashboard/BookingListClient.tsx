'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  X,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RatingModal } from './RatingModal'
import { useAuthStore } from '@/store/useAuthStore'
import { useRealtimeTable } from '@/hooks/useRealtime'

const statusMap = {
  CONFIRMED: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Upcoming' },
  PENDING: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    label: 'Awaiting Approval',
  },
  COMPLETED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Played' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
}

interface Booking {
  id: string
  venueId: string
  venue: string
  area: string
  date: string
  time: string
  amount: number
  advance: number
  status: string
  reviewStatus?: string
  hiddenFromPlayer?: boolean
  review?: {
    rating: number
    feedback: string
    groundQuality?: number
    lighting?: number
    cleanliness?: number
    staffBehaviour?: number
    valueForMoney?: number
  } | null
  image: string
  rawStartTime: string
  rawEndTime?: string
  rawDate?: string
  cancellationPolicy?: string
  qrCode?: string
  checkInStatus?: string
  bookingVersion: number
  cancellationReason?: string
  cancelledBy?: string
  cancelledAt?: string
  refundStatus: string
  refundAmount?: number
  refundReference?: string
  refundCompletedAt?: string
}

interface BookingListClientProps {
  initialBookings: Booking[]
  cancellationPolicyRules?: { hours: number; refund_percent: number }[]
}

export function BookingListClient({
  initialBookings,
  cancellationPolicyRules,
}: BookingListClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [activeTab, setActiveTab] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Cancellation system states
  const [cancellationModalBooking, setCancellationModalBooking] = useState<Booking | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationSuccessData, setCancellationSuccessData] = useState<any | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Review & Archive state
  const [activeReviewBooking, setActiveReviewBooking] = useState<Booking | null>(null)
  const [archiveConfirmBooking, setArchiveConfirmBooking] = useState<Booking | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Sync with server updates
  useEffect(() => {
    setBookings(initialBookings)
  }, [initialBookings])

  const user = useAuthStore((state) => state.user)

  // Real-time subscription for live production
  useRealtimeTable('bookings', user ? `customer_id=eq.${user.id}` : undefined, async (event) => {
    const { eventType, new: newRow, old: oldRow } = event
    if (eventType === 'DELETE') {
      setBookings((prev) => prev.filter((b) => b.id !== oldRow.id))
      return
    }

    // Fetch the single updated booking with joins
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
          id,
          total_amount,
          advance_paid,
          status,
          qr_code,
          check_in_status,
          review_status,
          hidden_from_player,
          booking_version,
          cancellation_reason,
          cancelled_by,
          cancelled_at,
          refund_status,
          refund_amount,
          refund_reference,
          refund_completed_at,
          slots (date, start_time, end_time),
          venues (id, name, address, owner_id)
        `
      )
      .eq('id', newRow.id)
      .maybeSingle()

    if (error || !data) return
    const bookingData = data as any

    // Format Date
    const dateObj = new Date(bookingData.slots.date)
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Format Time
    const formatTime = (timeStr: string) => {
      const t = new Date(timeStr)
      return t.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    const formattedTime = `${formatTime(bookingData.slots.start_time)} – ${formatTime(bookingData.slots.end_time)}`

    const formattedBooking: Booking = {
      id: bookingData.id,
      venueId: bookingData.venues.id,
      venue: bookingData.venues.name,
      area: bookingData.venues.address?.split(',')[0]?.trim() || 'Unknown',
      date: formattedDate,
      time: formattedTime,
      amount: Number(bookingData.total_amount),
      advance: Number(bookingData.advance_paid),
      status: bookingData.status,
      reviewStatus: bookingData.review_status,
      hiddenFromPlayer: bookingData.hidden_from_player,
      review: null,
      image:
        'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
      rawStartTime: bookingData.slots.start_time,
      rawEndTime: bookingData.slots.end_time,
      rawDate: bookingData.slots.date,
      cancellationPolicy: 'flexible',
      qrCode: bookingData.qr_code,
      checkInStatus: bookingData.check_in_status,
      bookingVersion: bookingData.booking_version || 1,
      cancellationReason: bookingData.cancellation_reason,
      cancelledBy: bookingData.cancelled_by,
      cancelledAt: bookingData.cancelled_at,
      refundStatus: bookingData.refund_status || 'NOT_REQUESTED',
      refundAmount: bookingData.refund_amount ? Number(bookingData.refund_amount) : undefined,
      refundReference: bookingData.refund_reference,
      refundCompletedAt: bookingData.refund_completed_at,
    }

    setBookings((prev) => {
      const exists = prev.some((b) => b.id === formattedBooking.id)
      if (exists) {
        // Conflict Resolution: Only update if the new version is greater or equal
        return prev.map((b) => {
          if (b.id === formattedBooking.id) {
            if ((formattedBooking.bookingVersion || 1) >= (b.bookingVersion || 1)) {
              return { ...b, ...formattedBooking }
            }
          }
          return b
        })
      } else {
        return [formattedBooking, ...prev]
      }
    })
  })

  // Countdown calculations
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})

  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {}
      bookings.forEach((b) => {
        if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') return

        let slotTime = 0
        if (b.rawDate) {
          slotTime = new Date(`${b.rawDate}T${b.rawStartTime}`).getTime()
        } else {
          // Fallback if rawDate is missing for some reason
          slotTime = new Date(b.rawStartTime).getTime()
        }

        const now = Date.now()
        const diff = slotTime - now

        if (diff <= 0) {
          newCountdowns[b.id] = 'Passed'
          return
        }

        const hrs = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (hrs > 24) {
          newCountdowns[b.id] = `In ${Math.ceil(hrs / 24)} days`
        } else if (hrs > 0) {
          newCountdowns[b.id] = `In ${hrs}h ${mins}m`
        } else {
          newCountdowns[b.id] = `In ${mins}m`
        }
      })
      setCountdowns(newCountdowns)
    }

    updateCountdowns()
    const interval = setInterval(updateCountdowns, 60000)
    return () => clearInterval(interval)
  }, [bookings])

  const getRefundPreview = (booking: Booking) => {
    if (!booking) return { percent: 0, amount: 0, hoursRemaining: 0 }

    let slotTime = 0
    if (booking.rawDate && booking.rawStartTime) {
      slotTime = new Date(`${booking.rawDate}T${booking.rawStartTime}`).getTime()
    } else {
      slotTime = new Date(booking.rawStartTime).getTime()
    }

    const now = Date.now()
    const diffHours = (slotTime - now) / (1000 * 60 * 60)

    if (diffHours <= 0) return { percent: 0, amount: 0, hoursRemaining: 0 }

    const rules = cancellationPolicyRules || [
      { hours: 24, refund_percent: 100 },
      { hours: 12, refund_percent: 75 },
      { hours: 6, refund_percent: 50 },
    ]

    const sortedRules = [...rules].sort((a, b) => b.hours - a.hours)

    let percent = 0
    for (const rule of sortedRules) {
      if (diffHours >= rule.hours) {
        percent = rule.refund_percent
        break
      }
    }

    const refundAmount = Math.round(booking.advance * (percent / 100) * 100) / 100
    return { percent, amount: refundAmount, hoursRemaining: Math.round(diffHours * 10) / 10 }
  }

  const handleCancelBookingClick = (booking: Booking) => {
    setCancellationModalBooking(booking)
    setCancellationReason('')
    setCancellationSuccessData(null)
  }

  const executeCancellation = async () => {
    if (!cancellationModalBooking) return

    const bookingId = cancellationModalBooking.id
    const originalBookings = [...bookings]

    // 1. Optimistic Update (Immediate transition)
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)))

    setIsCancelling(true)

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          cancellationReason: cancellationReason || 'Player cancelled match',
          expectedVersion: cancellationModalBooking.bookingVersion,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      setCancellationSuccessData({
        refundAmount: data.refund_amount,
        refundPercent: data.refund_percent,
        refundStatus: data.refund_status,
        refundId: data.refund_id,
        reference: data.idempotency_key,
      })
    } catch (err: any) {
      // 2. Rollback local state on request failure
      setBookings(originalBookings)
      setToast({ message: err.message || 'An error occurred during cancellation', type: 'error' })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleArchiveBooking = async (bookingId: string) => {
    setIsArchiving(true)
    try {
      const res = await fetch('/api/bookings/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to archive booking')
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, hiddenFromPlayer: true } : b))
      )
      setToast({ message: 'Booking archived successfully.', type: 'success' })
      setArchiveConfirmBooking(null)
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setIsArchiving(false)
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const isPast = b.rawEndTime ? new Date(b.rawEndTime) < new Date() : false

    if (b.hiddenFromPlayer) {
      return activeTab === 'Archived'
    }
    if (activeTab === 'Archived') {
      return false
    }

    if (activeTab === 'Upcoming') {
      return (b.status === 'CONFIRMED' || b.status === 'PENDING') && !isPast
    }
    if (activeTab === 'Completed') {
      return (
        b.status === 'COMPLETED' || ((b.status === 'CONFIRMED' || b.status === 'PENDING') && isPast)
      )
    }
    if (activeTab === 'Cancelled') {
      return b.status === 'CANCELLED'
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-50 px-5 py-3.5 rounded-xl text-sm font-semibold border shadow-2xl flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-green-950/90 text-green-400 border-green-500/20'
                : 'bg-red-950/90 text-red-400 border-red-500/20'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white/5 rounded-xl p-1 border border-white/8 w-full sm:w-fit">
        {['All', 'Upcoming', 'Completed', 'Archived', 'Cancelled'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t
                ? 'bg-green-500 text-black shadow-lg shadow-green-900/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Booking Cards Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-4">
            <div className="text-4xl">🏏</div>
            <div>
              <p className="text-sm font-bold text-white">
                No {activeTab.toLowerCase()} bookings found
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready for your first innings?</p>
            </div>
            <Link
              href="/venues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-xs transition-all"
            >
              Explore Turfs
            </Link>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const s = statusMap[b.status as keyof typeof statusMap] || statusMap.CONFIRMED
            const Icon = s.icon

            return (
              <motion.div
                layout
                key={b.id}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col justify-between hover:border-white/15 transition-all group"
              >
                {/* Header Image Strip */}
                <div className="h-32 relative overflow-hidden bg-black/40 rounded-t-2xl">
                  <img
                    src={b.image}
                    alt={b.venue}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />

                  {/* Status Badge */}
                  <span
                    className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${s.color} ${s.bg} border-white/5`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {s.label}
                  </span>

                  {/* Countdown for upcoming */}
                  {(b.status === 'CONFIRMED' || b.status === 'PENDING') && countdowns[b.id] && (
                    <span className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-extrabold tracking-wider uppercase">
                      <Clock className="w-3 h-3" /> {countdowns[b.id]}
                    </span>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors">
                        {b.venue}
                      </h3>
                      <span className="font-mono text-[10px] text-gray-500">#{b.id}</span>
                    </div>

                    <div className="flex flex-col gap-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-green-400" /> {b.area}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-green-400" /> {b.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-green-400" /> {b.time}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  {/* Pricing and Actions */}
                  <div className="flex justify-between items-end gap-3 flex-wrap">
                    <div className="w-full sm:w-auto">
                      <p className="text-sm font-extrabold text-white">
                        ₹{b.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        ₹{b.advance} advance paid
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {/* View Details Button */}
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      {/* Cancel Booking for upcoming */}
                      {(b.status === 'CONFIRMED' || b.status === 'PENDING') &&
                        b.cancellationPolicy !== 'strict' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelBookingClick(b)
                            }}
                            disabled={loadingId === b.id}
                            className="px-3.5 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-black hover:border-red-500 text-red-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}

                      {/* Rebook & Review for completed/cancelled */}
                      {(b.status === 'COMPLETED' || b.status === 'CANCELLED') && (
                        <>
                          <Link
                            href={`/venues/${b.venueId}`}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Rebook
                          </Link>

                          {b.status === 'COMPLETED' && (
                            <>
                              {b.reviewStatus === 'SUBMITTED' || b.review ? (
                                <>
                                  <button
                                    onClick={() => setActiveReviewBooking(b)}
                                    className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500 hover:text-black hover:border-green-500 text-green-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                                  >
                                    <Star className="w-3 h-3 fill-current" /> View/Edit Review
                                  </button>
                                  <button
                                    onClick={() => setArchiveConfirmBooking(b)}
                                    className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 text-yellow-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                                  >
                                    Archive
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setActiveReviewBooking(b)}
                                    className="px-3 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1 shadow-lg hover:shadow-yellow-500/10"
                                  >
                                    <Star className="w-3 h-3 fill-current animate-pulse" /> Rate
                                    Experience
                                  </button>
                                  <div className="relative group inline-block">
                                    <button
                                      disabled
                                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-500 font-bold text-[10px] tracking-wide uppercase cursor-not-allowed opacity-50"
                                    >
                                      Archive
                                    </button>
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[250px] whitespace-normal p-2 bg-[#0c120c] border border-white/10 rounded-lg shadow-xl text-center text-[10px] font-semibold text-yellow-400 z-20 pointer-events-none">
                                      Complete your review to unlock Archive. 🎁 Earn up to +50 XP
                                      instantly!
                                    </div>
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* DETAILS MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl border border-white/8 bg-gradient-to-br from-[#0a0f0a] to-[#040804] p-6 shadow-2xl overflow-hidden"
            >
              {/* Card Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />

              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Booking Receipt
                  </span>
                  <h3 className="text-xl font-bold text-white">{selectedBooking.venue}</h3>
                  <p className="text-xs text-green-400 font-semibold">{selectedBooking.area}</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/40 p-4 space-y-3 font-mono text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase font-sans">Booking ID</span>
                    <span>#{selectedBooking.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase font-sans">Date</span>
                    <span>{selectedBooking.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase font-sans">Time</span>
                    <span>{selectedBooking.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase font-sans">Status</span>
                    <span
                      className={statusMap[selectedBooking.status as keyof typeof statusMap]?.color}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-white font-bold text-sm">
                    <span className="uppercase font-sans">Total Price</span>
                    <span>₹{selectedBooking.amount}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-green-400">
                    <span className="uppercase font-sans">Advance Paid</span>
                    <span>-₹{selectedBooking.advance}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span className="uppercase font-sans">Balance Due</span>
                    <span>₹{selectedBooking.amount - selectedBooking.advance}</span>
                  </div>
                  {selectedBooking.qrCode && (
                    <div className="border-t border-white/5 pt-3 space-y-2 text-center">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">
                        QR Ticket Code
                      </span>
                      <span className="inline-block px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-mono font-bold select-all">
                        {selectedBooking.qrCode}
                      </span>
                      <div className="flex justify-center items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-gray-500 uppercase font-sans">
                          Check-in:
                        </span>
                        <span
                          className={`text-[9px] font-bold ${selectedBooking.checkInStatus === 'CHECKED_IN' ? 'text-green-400' : 'text-gray-500'}`}
                        >
                          {selectedBooking.checkInStatus === 'CHECKED_IN'
                            ? 'CHECKED IN'
                            : 'NOT CHECKED IN'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Close
                  </button>
                  {(selectedBooking.status === 'CONFIRMED' ||
                    selectedBooking.status === 'PENDING') &&
                    selectedBooking.cancellationPolicy !== 'strict' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(null)
                          handleCancelBookingClick(selectedBooking)
                        }}
                        className="flex-1 py-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-wider transition-colors"
                      >
                        Cancel Match
                      </button>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RATING MODAL */}
      <AnimatePresence>
        {activeReviewBooking && (
          <RatingModal
            bookingId={activeReviewBooking.id}
            venueName={activeReviewBooking.venue}
            initialValues={
              activeReviewBooking.review
                ? {
                    rating: activeReviewBooking.review.rating,
                    feedback: activeReviewBooking.review.feedback,
                    groundQuality: activeReviewBooking.review.groundQuality,
                    lighting: activeReviewBooking.review.lighting,
                    cleanliness: activeReviewBooking.review.cleanliness,
                    staffBehaviour: activeReviewBooking.review.staffBehaviour,
                    valueForMoney: activeReviewBooking.review.valueForMoney,
                  }
                : undefined
            }
            onClose={() => setActiveReviewBooking(null)}
            onSubmitSuccess={(xpAwarded, newLevel) => {
              router.refresh()
              setActiveReviewBooking(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ARCHIVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {archiveConfirmBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setArchiveConfirmBooking(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c120c] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 font-sans"
            >
              <h3 className="text-lg font-bold text-white mb-2">Archive Completed Match?</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Your review has been saved successfully. This will hide the completed match from
                your dashboard, but it will remain in your booking history.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setArchiveConfirmBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-xs tracking-wider uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isArchiving}
                  onClick={() => handleArchiveBooking(archiveConfirmBooking.id)}
                  className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs tracking-wider uppercase transition-all disabled:opacity-45"
                >
                  {isArchiving ? 'Archiving...' : 'Archive Match'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* CANCELLATION SYSTEM MODALS */}
      <AnimatePresence>
        {cancellationModalBooking && !cancellationSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                if (!isCancelling) setCancellationModalBooking(null)
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b100b] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 font-sans text-left"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Cancel Match Reservation</h3>
                <button
                  disabled={isCancelling}
                  onClick={() => setCancellationModalBooking(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Booking Summary */}
              <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-4 space-y-2">
                <h4 className="text-sm font-semibold text-yellow-400">
                  {cancellationModalBooking.venue}
                </h4>
                <div className="flex gap-4 text-xs text-gray-300">
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" /> {cancellationModalBooking.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {cancellationModalBooking.time}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between text-xs font-semibold">
                  <span className="text-gray-400">Total Advance Paid:</span>
                  <span className="text-white">₹{cancellationModalBooking.advance}</span>
                </div>
              </div>

              {/* SLA / Cancellation Refund Calculation */}
              {(() => {
                const { percent, amount, hoursRemaining } =
                  getRefundPreview(cancellationModalBooking)
                return (
                  <div className="space-y-3 mb-6">
                    <div className="p-4 rounded-xl border flex items-start gap-3 bg-blue-500/10 border-blue-500/20 text-blue-400">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-white">Cancellation Policy Details</p>
                        <p>
                          Time remaining before start:{' '}
                          <span className="font-bold text-white">{hoursRemaining} hours</span>.
                        </p>
                        <p>
                          Based on our policy, you are eligible for a{' '}
                          <span className="font-bold text-white">{percent}% refund</span>.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Refund Eligible amount ({percent}%):</span>
                        <span className="text-green-400 font-bold">₹{amount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Platform commission retained:</span>
                        <span className="text-red-400">
                          ₹{(cancellationModalBooking.advance - amount).toFixed(2)}
                        </span>
                      </div>
                      {amount > 0 && (
                        <p className="text-[10px] text-gray-500 italic pt-1 border-t border-white/5">
                          * Refund will be processed automatically to your original payment source
                          in 3–5 business days.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Cancellation Reason */}
              <div className="space-y-1.5 mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  disabled={isCancelling}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Change of plans, bad weather..."
                  className="w-full h-20 bg-white/5 border border-white/8 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 resize-none transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  disabled={isCancelling}
                  onClick={() => setCancellationModalBooking(null)}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  Keep Booking
                </button>
                <button
                  disabled={isCancelling}
                  onClick={executeCancellation}
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-45 flex items-center gap-1.5 shadow-lg shadow-red-500/10"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCELLATION SUCCESS SCREEN */}
      <AnimatePresence>
        {cancellationSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b100b] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative z-10 text-center font-sans"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5 text-green-400">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Booking Cancelled Successfully</h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Your slots have been released back to availability immediately.
              </p>

              {/* Refund Info */}
              <div className="bg-white/5 border border-white/8 rounded-xl p-5 mb-8 space-y-3.5 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Refund Status:</span>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                    {cancellationSuccessData.refundStatus === 'QUEUED'
                      ? 'Refund Initiated'
                      : 'Refund Completed'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Refund Amount:</span>
                  <span className="text-white font-bold text-sm">
                    ₹{cancellationSuccessData.refundAmount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Reference:</span>
                  <span
                    className="text-gray-300 font-mono text-[10px]"
                    title={cancellationSuccessData.reference}
                  >
                    {cancellationSuccessData.reference?.substring(0, 18)}...
                  </span>
                </div>
                {cancellationSuccessData.refundAmount > 0 && (
                  <div className="pt-3 border-t border-white/5 flex gap-2 items-start text-[10px] text-gray-400 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Credits will reflect in your original payment method within{' '}
                      <strong className="text-white">3–5 business days</strong> depending on your
                      bank.
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setCancellationSuccessData(null)
                  setCancellationModalBooking(null)
                  router.refresh()
                }}
                className="w-full py-3.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/10"
              >
                Back to My Bookings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
