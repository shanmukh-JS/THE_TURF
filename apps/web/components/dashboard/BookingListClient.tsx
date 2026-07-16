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
  image: string
  rawStartTime: string
  rawEndTime?: string
  rawDate?: string
  cancellationPolicy?: string
  qrCode?: string
  checkInStatus?: string
}

interface BookingListClientProps {
  initialBookings: Booking[]
}

export function BookingListClient({ initialBookings }: BookingListClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [activeTab, setActiveTab] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

  // Handle Booking Cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setLoadingId(bookingId)
    const shortId = bookingId.substring(0, 8).toUpperCase()

    // 1. Get full booking details first
    const { data: bookingData, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, slot_id')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !bookingData) {
      setToast({ message: 'Failed to retrieve booking information.', type: 'error' })
      setLoadingId(null)
      return
    }

    // 2. Update booking status to CANCELLED
    const { error: cancelErr } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId)

    if (cancelErr) {
      setToast({ message: cancelErr.message, type: 'error' })
      setLoadingId(null)
      return
    }

    // 3. Free up the slot in the slots table
    if (bookingData.slot_id) {
      await supabase
        .from('slots')
        .update({ status: 'Available', is_booked: false })
        .eq('id', bookingData.slot_id)
    }

    setToast({ message: 'Booking cancelled successfully.', type: 'success' })
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)))
    setLoadingId(null)
  }

  const handleSubmitReview = async () => {
    if (!reviewBooking) return
    setReviewLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setToast({ message: 'You must be logged in to leave a review.', type: 'error' })
      setReviewLoading(false)
      return
    }
    // 1. Save to public.reviews (frontend Turf average displays)
    const { error: reviewsErr } = await supabase.from('reviews').insert({
      venue_id: reviewBooking.venueId,
      customer_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    })

    if (reviewsErr) {
      setToast({ message: reviewsErr.message, type: 'error' })
      setReviewLoading(false)
      return
    }

    // 2. Sync to public.venue_ratings (owner analytics and detailed breakdown)
    const { error: ratingsErr } = await supabase.from('venue_ratings').insert({
      booking_id: reviewBooking.id,
      user_id: user.id,
      overall_rating: reviewRating,
      ground_quality: reviewRating,
      lighting: reviewRating,
      staff_behaviour: reviewRating,
      cleanliness: reviewRating,
      value_for_money: reviewRating,
      comments: reviewComment.trim() || null,
      sentiment: reviewRating >= 4 ? 'POSITIVE' : reviewRating <= 2 ? 'NEGATIVE' : 'NEUTRAL',
      moderation_status: 'APPROVED',
    })

    if (ratingsErr) {
      console.error('Failed to sync to venue_ratings table:', ratingsErr)
    }

    setReviewedIds((prev) => new Set([...prev, reviewBooking.id]))
    setToast({ message: 'Review submitted! Thank you.', type: 'success' })
    setReviewBooking(null)
    setReviewComment('')
    setReviewRating(5)
    setReviewLoading(false)
  }

  const filteredBookings = bookings.filter((b) => {
    const isPast = b.rawEndTime ? new Date(b.rawEndTime) < new Date() : false

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
      <div className="flex gap-2 bg-white/5 rounded-xl p-1 border border-white/8 w-fit">
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map((t) => (
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
                className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden flex flex-col justify-between hover:border-white/15 transition-all group"
              >
                {/* Header Image Strip */}
                <div className="h-32 relative overflow-hidden bg-black/40">
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
                    <div>
                      <p className="text-sm font-extrabold text-white">
                        ₹{b.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        ₹{b.advance} advance paid
                      </p>
                    </div>

                    <div className="flex gap-2">
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
                            onClick={() => {
                              if (b.cancellationPolicy === 'moderate' && b.rawDate) {
                                const slotTime = new Date(
                                  `${b.rawDate}T${b.rawStartTime}`
                                ).getTime()
                                const diff = slotTime - Date.now()
                                if (diff < 86400000) {
                                  alert(
                                    'This venue has a moderate cancellation policy. You cannot cancel within 24 hours of the slot.'
                                  )
                                  return
                                }
                              }
                              handleCancelBooking(b.id)
                            }}
                            disabled={loadingId === b.id}
                            className="px-3.5 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-black hover:border-red-500 text-red-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              b.cancellationPolicy === 'moderate'
                                ? 'Moderate Policy: Can only cancel 24h before'
                                : ''
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}

                      {/* Rebook & Review for completed/cancelled */}
                      {(b.status === 'COMPLETED' || b.status === 'CANCELLED') && (
                        <>
                          <Link
                            href={`/venues/${b.venueId}`}
                            className="px-3.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500 hover:text-black hover:border-green-500 text-green-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Rebook
                          </Link>
                          {b.status === 'COMPLETED' && !reviewedIds.has(b.id) && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/rating/token?bookingId=${b.id}`)
                                  const data = await res.json()
                                  if (!res.ok)
                                    throw new Error(data.error || 'Failed to fetch rating token')
                                  router.push(`/rating/${b.id}?token=${data.token}`)
                                } catch (err: any) {
                                  alert(err.message)
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black hover:border-amber-500 text-amber-400 font-bold text-[10px] tracking-wide uppercase transition-all flex items-center gap-1"
                            >
                              <Star className="w-3.5 h-3.5" /> Review
                            </button>
                          )}
                          {reviewedIds.has(b.id) && (
                            <span className="px-3.5 py-2 text-[10px] text-green-400 font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-green-400" /> Reviewed!
                            </span>
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
                          if (
                            selectedBooking.cancellationPolicy === 'moderate' &&
                            selectedBooking.rawDate
                          ) {
                            const slotTime = new Date(
                              `${selectedBooking.rawDate}T${selectedBooking.rawStartTime}`
                            ).getTime()
                            const diff = slotTime - Date.now()
                            if (diff < 86400000) {
                              alert(
                                'This venue has a moderate cancellation policy. You cannot cancel within 24 hours of the slot.'
                              )
                              return
                            }
                          }
                          setSelectedBooking(null)
                          handleCancelBooking(selectedBooking.id)
                        }}
                        className="flex-1 py-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-wider transition-colors"
                        title={
                          selectedBooking.cancellationPolicy === 'moderate'
                            ? 'Moderate Policy: Can only cancel 24h before'
                            : ''
                        }
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

      {/* REVIEW MODAL */}
      <AnimatePresence>
        {reviewBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl border border-white/8 bg-gradient-to-br from-[#0a0f0a] to-[#040804] p-6 shadow-2xl"
            >
              <button
                onClick={() => setReviewBooking(null)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Leave a Review</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{reviewBooking.venue}</p>
                </div>

                {/* Star Rating Picker */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Your Rating
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= reviewRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-700 fill-gray-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-amber-400 mt-1 font-medium">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][reviewRating]}
                  </p>
                </div>

                {/* Comment */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Comment <span className="text-gray-600 normal-case">(optional)</span>
                  </p>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 text-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmitReview}
                  disabled={reviewLoading}
                  className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reviewLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 fill-black" /> Submit Review
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
