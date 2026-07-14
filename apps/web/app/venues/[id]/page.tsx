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
  Heart,
} from 'lucide-react'
import { ImageCarousel } from '@/components/venues/ImageCarousel'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

// Default values for fields not stored in DB
const defaultAmenities = ['Parking', 'WiFi', 'Floodlights', 'Changing Rooms', 'Water Dispenser']
const defaultRules = ['No metal spikes allowed', 'Booking must be cancelled 2 hrs before slot']

export default function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [venue, setVenue] = useState<any | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [ownerSettings, setOwnerSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [paymentPhase, setPaymentPhase] = useState<string>('')

  // Booking modal states
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Favorites State
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  // Check if current venue is favorited
  useEffect(() => {
    async function checkFavorite() {
      if (!currentUser || !id) return
      try {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('venue_id', id)
          .maybeSingle()
        if (data) {
          setIsFavorite(true)
        }
      } catch (err) {
        console.error('Error checking favorite status:', err)
      }
    }
    checkFavorite()
  }, [currentUser, id])

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    setFavLoading(true)
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('venue_id', id)
        if (error) throw error
        setIsFavorite(false)
        setToast({ message: 'Removed from favorites', type: 'success' })
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: currentUser.id,
          venue_id: id,
        })
        if (error) throw error
        setIsFavorite(true)
        setToast({ message: 'Added to favorites!', type: 'success' })
      }
    } catch (e: any) {
      console.error('Favorite Toggle Error:', e)
      setToast({
        message: `Error: ${e.message || 'Failed to update favorite status'}`,
        type: 'error',
      })
    } finally {
      setFavLoading(false)
    }
  }

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSelectSlot = (slot: any) => {
    setSelectedSlot(slot)
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'tg_draft_booking',
        JSON.stringify({
          venueId: id,
          venueName: venue?.name || 'the Turf',
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

    const { data: ownerProfileData } = await supabase
      .from('owner_profiles')
      .select('user_id')
      .eq('id', venueData.owner_id)
      .maybeSingle()

    const isOwner = session?.user?.id === ownerProfileData?.user_id

    // If venue is not approved and user is not the owner, don't show it
    if (venueData.verification_status !== 'APPROVED' && !isOwner) {
      setLoading(false)
      return // Will render a not-found or access-denied state below
    }
    // Format venue object
    const formattedVenue = {
      id: venueData.id,
      name: venueData.name,
      description: venueData.description || 'No description provided.',
      area: venueData.area?.name || 'Unknown Area',
      city: venueData.city?.name || venueData.address?.split(',')[4]?.trim() || 'Unknown City',
      address: venueData.address,
      rating: null as number | null,
      reviewsCount: 0,
      price: Array.isArray(venueData.venue_pricing)
        ? venueData.venue_pricing[0]?.price
        : venueData.venue_pricing?.price || 1000,
      pitches: venueData.pitches || 1,
      isIndoor: venueData.is_indoor || false,
      verificationStatus: venueData.verification_status,
      openingTime: venueData.opening_time || '06:00:00',
      closingTime: venueData.closing_time || '23:00:00',
      amenities:
        venueData.amenities && venueData.amenities.length > 0
          ? venueData.amenities
          : defaultAmenities,
      images:
        venueData.venue_images && venueData.venue_images.length > 0
          ? venueData.venue_images.map((img: any) => img.url)
          : [
              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
            ],
      ownerUserId: ownerProfileData?.user_id || null,
      isOwner,
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

    // Fetch owner settings for buffer time and auto-accept
    const { data: ownerSettingsData } = await supabase
      .from('owner_settings')
      .select(
        'auto_accept_bookings, booking_buffer_time, cancellation_policy, notify_bookings, notify_email, max_players_per_booking'
      )
      .eq('owner_id', venueData.owner_id)
      .maybeSingle()

    setOwnerSettings(ownerSettingsData)

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
      let activeSlots = slotsData

      // Apply buffer time
      if (ownerSettingsData?.booking_buffer_time && ownerSettingsData.booking_buffer_time !== '0') {
        const now = new Date()
        let bufferMs = 0
        if (ownerSettingsData.booking_buffer_time === '15_mins') bufferMs = 15 * 60 * 1000
        else if (ownerSettingsData.booking_buffer_time === '30_mins') bufferMs = 30 * 60 * 1000
        else if (ownerSettingsData.booking_buffer_time === '1_hour') bufferMs = 60 * 60 * 1000

        const thresholdTime = now.getTime() + bufferMs

        activeSlots = activeSlots.filter((slot: any) => {
          // Create date obj supporting both full ISO timestamps and legacy timezone-less time strings
          const slotStart = slot.start_time.includes('T')
            ? new Date(slot.start_time)
            : new Date(`${slot.date}T${slot.start_time}`)
          return slotStart.getTime() >= thresholdTime
        })
      }

      setSlots(activeSlots)
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

  // Handle Checkout Booking flow — Razorpay integrated
  const handleConfirmBooking = async () => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    if (!selectedSlot || !venue) return

    setBookingLoading(true)
    setPaymentPhase('Reserving slot...')

    try {
      const advanceAmount = Math.round(selectedSlot.price * 0.5)

      // Step 1: Lock slot + create Razorpay order
      const checkoutRes = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          venueId: id,
          totalAmount: selectedSlot.price,
          advancePaid: advanceAmount,
        }),
      })

      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Failed to initialize checkout')
      }

      const { order, checkoutId } = checkoutData
      setPaymentPhase('Opening payment...')

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TRUF GAMING',
        description: `Advance for ${venue.name}`,
        order_id: order.orderId,
        handler: async function (response: any) {
          try {
            setPaymentPhase('Verifying payment...')

            // Step 3: Verify payment signature + create booking
            const verifyRes = await fetch('/api/bookings/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                slotId: selectedSlot.id,
                venueId: id,
                totalAmount: selectedSlot.price,
                advancePaid: advanceAmount,
                checkoutId,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Payment verification failed')
            }

            // Step 4: Booking confirmed with real ID
            if (typeof window !== 'undefined') {
              localStorage.removeItem('tg_draft_booking')
            }

            setSelectedSlot(null)
            setBookingLoading(false)
            setPaymentPhase('')
            setToast({
              message: `Booking confirmed! ID: ${verifyData.bookingId?.substring(0, 8).toUpperCase()}`,
              type: 'success',
            })

            setTimeout(() => {
              router.push('/player/bookings')
            }, 2000)
          } catch (verifyErr: any) {
            setToast({ message: verifyErr.message || 'Verification failed', type: 'error' })
            setBookingLoading(false)
            setPaymentPhase('')
            fetchData()
          }
        },
        prefill: {
          name: currentUser.user_metadata?.full_name || '',
          contact: currentUser.phone || '',
        },
        theme: { color: '#22c55e' },
        modal: {
          ondismiss: function () {
            setBookingLoading(false)
            setPaymentPhase('')
            setToast({
              message: 'Payment cancelled. Slot will be released shortly.',
              type: 'error',
            })
            fetchData()
          },
        },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setToast({ message: `Payment failed: ${response.error.description}`, type: 'error' })
        setBookingLoading(false)
        setPaymentPhase('')
        fetchData()
      })
      rzp.open()
    } catch (error: any) {
      setToast({ message: error.message || 'Checkout failed', type: 'error' })
      setBookingLoading(false)
      setPaymentPhase('')
      fetchData()
    }
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

  const formatTimeStr = (timeStr: string) => {
    if (!timeStr) return ''
    const parts = timeStr.split(':')
    const hours = parseInt(parts[0] || '0', 10)
    const minutes = parts[1] || '00'
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const dispHours = hours % 12 || 12
    return `${dispHours}:${minutes} ${ampm}`
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

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
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
            </div>

            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 font-bold text-xs shrink-0 select-none ${
                isFavorite
                  ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-300 ${
                  isFavorite ? 'fill-red-500 scale-110' : 'scale-100 hover:scale-110'
                }`}
              />
              {isFavorite ? 'Favorited' : 'Favorite'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/20">
              ₹{venue.price.toLocaleString()} / hour
            </span>
            {venue.reviewsCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <strong className="text-white">{venue.rating}</strong> ({venue.reviewsCount}{' '}
                {venue.reviewsCount === 1 ? 'review' : 'reviews'})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400">
                <Star className="w-4 h-4 text-gray-500" />
                <strong className="text-gray-400">New Turf</strong> (0 reviews)
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {venue.address || `${venue.area}, ${venue.city}`}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-green-400" />
              {venue.isIndoor ? 'Indoor Box' : 'Outdoor Turf'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {venue.pitches} {venue.pitches > 1 ? 'Pitches' : 'Pitch'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-green-400" />
              Timings: {formatTimeStr(venue.openingTime)} – {formatTimeStr(venue.closingTime)}
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
            {venue.amenities.map((a: string) => (
              <div key={a} className="flex items-center gap-2 text-sm text-gray-300">
                <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold mb-4 text-amber-300">Rules & Regulations</h2>
          <ul className="space-y-2">
            {defaultRules.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-amber-400 mt-0.5">•</span> {r}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-amber-400 mt-0.5">•</span> Maximum{' '}
              {ownerSettings?.max_players_per_booking || 12} players per booking
            </li>
            {ownerSettings?.cancellation_policy && (
              <li className="flex items-start gap-2 text-sm text-gray-300 mt-4 pt-4 border-t border-amber-500/20">
                <span className="text-amber-400 mt-0.5">•</span>
                <div>
                  <strong>Cancellation Policy:</strong>
                  <span className="ml-1 text-gray-400">
                    {ownerSettings.cancellation_policy === 'flexible' &&
                      'Flexible (Cancel anytime before the slot begins)'}
                    {ownerSettings.cancellation_policy === 'moderate' &&
                      'Moderate (Cancel up to 24 hours before the slot begins)'}
                    {ownerSettings.cancellation_policy === 'strict' &&
                      'Strict (No cancellations allowed)'}
                  </span>
                </div>
              </li>
            )}
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
                  {bookingLoading
                    ? paymentPhase || 'Processing...'
                    : `Pay ₹${Math.round(selectedSlot.price * 0.5).toLocaleString()} & Book`}
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
