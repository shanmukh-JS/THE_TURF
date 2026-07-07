'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Star,
  Clock,
  Zap,
  Shield,
  ChevronRight,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { ImageCarousel } from '@/components/venues/ImageCarousel'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

// Default values for fields not stored in DB
const defaultAmenities = ['Parking', 'WiFi', 'Floodlights', 'Changing Rooms', 'Water Dispenser']
const defaultRules = [
  'No metal spikes allowed',
  'Booking must be cancelled 2 hrs before slot',
  'Maximum 12 players per booking',
]

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [venue, setVenue] = useState<any | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  // Booking modal states
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSelectSlot = (slot: any) => {
    setSelectedSlot(slot)
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'tg_draft_booking',
        JSON.stringify({
          venueId: id,
          venueName: venue?.name || 'Olympia Turf',
          slotDate: slot.date,
          slotTime: `${formatSlotTime(slot.start_time)} – ${formatSlotTime(slot.end_time)}`,
          price: slot.price,
          timestamp: Date.now(),
        })
      )
    }
  }

  // Filter slots by sport
  const [sportFilter, setSportFilter] = useState('ALL')

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchData = async () => {
    setLoading(true)

    // Get current user session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      setCurrentUser(session.user)
    }

    // Fetch venue details
    const { data: venueData } = await supabase
      .from('venues')
      .select(
        `
        *,
        city:cities(name),
        area:areas(name),
        venue_pricing(price),
        venue_images(url, is_cover)
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (!venueData) {
      setLoading(false)
      return
    }

    // Format venue object
    const formattedVenue = {
      id: venueData.id,
      name: venueData.name,
      description: venueData.description || 'No description provided.',
      area: venueData.area?.name || 'Unknown Area',
      city: venueData.city?.name || 'Unknown City',
      address: venueData.address,
      rating: 4.8, // Default rating fallback
      reviewsCount: 0,
      price: venueData.venue_pricing?.[0]?.price || 1000,
      pitches: venueData.pitches || 1,
      isIndoor: venueData.is_indoor || false,
      verificationStatus: venueData.verification_status,
      images:
        venueData.venue_images && venueData.venue_images.length > 0
          ? venueData.venue_images.map((img: any) => img.url)
          : [
              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
            ],
    }

    setVenue(formattedVenue)

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(
        `
        id,
        rating,
        comment,
        created_at
      `
      )
      .eq('venue_id', id)

    if (reviewsData) {
      setReviews(reviewsData)
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0)
        formattedVenue.rating = parseFloat((totalRating / reviewsData.length).toFixed(1))
        formattedVenue.reviewsCount = reviewsData.length
      }
    }

    // Fetch available future slots
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: slotsData } = await supabase
      .from('slots')
      .select('*')
      .eq('venue_id', id)
      .eq('status', 'Available')
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (slotsData) {
      setSlots(slotsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Real-time synchronization for slots
  useEffect(() => {
    const channel = supabase
      .channel(`venue-slots-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `venue_id=eq.${id}` },
        () => {
          // Re-fetch slots to ensure instant dashboard updates
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // Handle Checkout Booking flow
  const handleConfirmBooking = async () => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    if (!selectedSlot) return

    setBookingLoading(true)

    const advanceAmount = Math.round(selectedSlot.price * 0.5)

    // 1. Double check slot is still available in DB
    const { data: checkSlot } = await supabase
      .from('slots')
      .select('status')
      .eq('id', selectedSlot.id)
      .single()

    if (!checkSlot || checkSlot.status !== 'Available') {
      setToast({
        message: 'This slot was just booked by another player! Please choose another timing.',
        type: 'error',
      })
      setSelectedSlot(null)
      setBookingLoading(false)
      fetchData()
      return
    }

    // 2. Create the booking entry
    const { error: bookingError } = await supabase.from('bookings').insert({
      slot_id: selectedSlot.id,
      venue_id: id,
      customer_id: currentUser.id,
      total_amount: selectedSlot.price,
      advance_paid: advanceAmount,
      status: 'CONFIRMED',
    })

    if (bookingError) {
      setToast({ message: bookingError.message, type: 'error' })
      setBookingLoading(false)
      return
    }

    // 3. Update the slot status
    const { error: slotError } = await supabase
      .from('slots')
      .update({ status: 'Booked', is_booked: true })
      .eq('id', selectedSlot.id)

    if (slotError) {
      setToast({ message: slotError.message, type: 'error' })
      setBookingLoading(false)
      return
    }

    // Clear draft booking from LocalStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tg_draft_booking')
    }

    setToast({ message: 'Booking confirmed! Redirecting...', type: 'success' })

    // Redirect after confirmation
    setTimeout(() => {
      router.push('/player/bookings')
    }, 1500)
  }

  // Format date helper
  const formatSlotDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Time formatter
  const formatSlotTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Filter slots based on sports filter
  const filteredSlots = slots.filter((s) => {
    if (sportFilter !== 'ALL' && s.sport_type !== sportFilter) return false
    return true
  })

  // Extract sports types available in current slots to dynamically populate filter tabs
  const availableSports = Array.from(new Set(slots.map((s) => s.sport_type)))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d06] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading venue details...</p>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#060d06] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-bold">Venue Not Found</h1>
          <p className="text-sm text-gray-500">
            The venue you are looking for does not exist or has been deleted.
          </p>
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Explore
          </Link>
        </div>
      </div>
    )
  }

  // Check if owner is approved
  const isApproved = venue.verificationStatus === 'APPROVED'

  return (
    <main className="min-h-screen bg-[#060d06] text-white pb-20">
      {/* Image Gallery */}
      <ImageCarousel images={venue.images} />

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/venues" className="hover:text-white transition-colors">
                Explore
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{venue.city}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white truncate">{venue.name}</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{venue.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <strong className="text-white">{venue.rating}</strong> ({venue.reviewsCount}{' '}
                reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {venue.area}, {venue.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-400" />
                {venue.isIndoor ? 'Indoor' : 'Outdoor'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {venue.pitches} {venue.pitches > 1 ? 'Pitches' : 'Pitch'}
              </span>
            </div>
          </div>

          {/* Verification Status Warning (Admin Integration check) */}
          {!isApproved && (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-500 text-sm">Venue Verification Pending</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  This venue is pending administrator approval. No booking slots can be scheduled or
                  booked until approval completes.
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold mb-3 text-white">About this venue</h2>
            <p className="text-gray-300 leading-relaxed">{venue.description}</p>
          </div>

          {/* AVAILABLE SLOTS SECTION */}
          {isApproved && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Available Slots</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Choose your preferred sport and timing to book.
                  </p>
                </div>

                {/* Sports Filter Tabs */}
                {availableSports.length > 0 && (
                  <div className="flex gap-1.5 bg-black/40 border border-white/5 rounded-xl p-1 w-fit">
                    <button
                      onClick={() => setSportFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        sportFilter === 'ALL'
                          ? 'bg-green-500 text-black shadow'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      All Sports
                    </button>
                    {availableSports.map((sport: any) => (
                      <button
                        key={sport}
                        onClick={() => setSportFilter(sport)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          sportFilter === sport
                            ? 'bg-green-500 text-black shadow'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredSlots.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-black/10">
                  <p className="text-sm text-gray-400">
                    No available slots listed for this turf box at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-xl border border-white/8 bg-black/20 p-5 flex flex-col justify-between gap-4 hover:border-green-500/20 transition-all hover:bg-black/30 group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="bg-green-500/15 text-green-400 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                            {slot.sport_type}
                          </span>
                          <span className="text-sm font-bold text-white">₹{slot.price}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            {formatSlotDate(slot.date)}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)} (
                            {slot.duration} mins)
                          </p>
                          {slot.max_players && (
                            <p className="text-[10px] text-gray-500">
                              Max Players limit: {slot.max_players}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectSlot(slot)}
                        className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-xs transition-colors flex items-center justify-center"
                      >
                        Book Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amenities */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {defaultAmenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {a}
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h2 className="text-lg font-semibold mb-4 text-amber-300">Venue Rules</h2>
            <ul className="space-y-2">
              {defaultRules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-amber-400 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Reviews */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white">
              Reviews{' '}
              <span className="text-gray-400 text-base font-normal ml-1">({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No reviews left for this venue yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-600/30 flex items-center justify-center text-sm font-bold text-green-300">
                          {(r.customer_profiles?.full_name || 'G').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {r.customer_profiles?.full_name || 'Gamer'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(r.created_at).toLocaleDateString([], {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                        {'★'.repeat(r.rating)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Static Preview Widget (For aesthetics/pricing display) */}
        <div className="sticky top-6 h-fit">
          <div className="rounded-2xl border border-green-500/20 bg-white/[0.03] p-6 space-y-5 shadow-2xl shadow-green-900/20">
            <div>
              <span className="text-3xl font-bold text-white">₹{venue.price.toLocaleString()}</span>
              <span className="text-gray-400 text-sm ml-1">/ hour</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <strong className="text-white">{venue.rating}</strong> · {reviews.length} reviews
            </div>

            <div className="border-t border-white/8 pt-4 space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Address</span>
                <span className="text-right text-white max-w-[150px] truncate">
                  {venue.address}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Type</span>
                <span className="text-white">{venue.isIndoor ? 'Indoor Box' : 'Outdoor Turf'}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Pitches</span>
                <span className="text-white">{venue.pitches} Pitch(es)</span>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-500 leading-relaxed">
              * Active slots for booking are displayed in the Available Slots section. Click
              &quot;Book Now&quot; to confirm your slots.
            </p>
          </div>
        </div>
      </div>

      {/* BOOKING CONFIRMATION MODAL */}
      {selectedSlot && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-green-400" />
                Confirm Booking
              </h2>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-3 bg-black/40 rounded-xl p-4 border border-white/5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Turf Box</span>
                  <span className="text-white font-semibold">{venue.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sport</span>
                  <span className="text-white font-semibold">{selectedSlot.sport_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-white font-semibold">
                    {formatSlotDate(selectedSlot.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time slot</span>
                  <span className="text-white font-semibold font-mono">
                    {formatSlotTime(selectedSlot.start_time)} –{' '}
                    {formatSlotTime(selectedSlot.end_time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white font-semibold">{selectedSlot.duration} Minutes</span>
                </div>
              </div>

              {/* Price Details */}
              <div className="border-t border-white/8 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Price</span>
                  <span>₹{selectedSlot.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Advance Paid (50%)</span>
                  <span className="text-green-400">
                    ₹{Math.round(selectedSlot.price * 0.5).toLocaleString()} due now
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/8 pt-2 mt-2 text-base">
                  <span>Total Booking Cost</span>
                  <span>₹{selectedSlot.price.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading}
                  className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all shadow-lg shadow-green-900/30 disabled:opacity-55"
                >
                  {bookingLoading ? 'Processing...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-2xl shadow-black/50 border border-gray-100">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm font-semibold text-gray-900">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
