/* eslint-disable @next/next/no-img-element */
'use client'

import { MapPin, Star, Clock, Wifi, Car, Zap, Filter, Search } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const amenityIcons: Record<string, React.ElementType> = {
  Parking: Car,
  WiFi: Wifi,
  Floodlights: Zap,
}

export default function VenuesPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [priceFilter, setPriceFilter] = useState('ALL')
  const [displayLocation, setDisplayLocation] = useState('Hyderabad')
  const [allVenues, setAllVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_location')
      if (saved) {
        setDisplayLocation(saved)
      }
    }
  }, [])

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('venues')
        .select(
          `
          *,
          city:cities(name),
          area:areas(name),
          venue_pricing(price),
          venue_images(url, is_cover),
          slots(status),
          reviews(rating)
        `
        )
        .eq('verification_status', 'APPROVED')
        .eq('is_disabled', false)

      if (!error && data) {
        const mappedVenues = data.map((v) => {
          const isTrending = v.id.charCodeAt(0) % 3 === 0

          // Live available slots count
          const availableSlots = v.slots || []
          const slotsCount = availableSlots.filter((s: any) => s.status === 'Available').length

          // Live ratings calculation from reviews table
          const venueReviews = v.reviews || []
          const hasReviews = venueReviews.length > 0
          const rating = hasReviews
            ? (
                venueReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
                venueReviews.length
              ).toFixed(1)
            : null
          const reviewsCount = venueReviews.length

          // Live amenities list
          const amenities =
            v.facilities && v.facilities.length > 0
              ? v.facilities
              : ['Parking', 'WiFi', 'Floodlights']

          // Live operating hours
          const peakHours = v.operating_hours || '7:00 PM – 10:00 PM'

          return {
            id: v.id,
            name: v.name,
            area: v.area?.name || 'Unknown Area',
            city: v.city?.name || 'Unknown City',
            rating,
            reviews: reviewsCount,
            price: v.venue_pricing?.[0]?.price || 1000,
            pitches: v.pitches,
            amenities,
            image:
              v.venue_images?.find((img: any) => img.is_cover)?.url ||
              v.venue_images?.[0]?.url ||
              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
            badge: isTrending ? 'Trending' : null,
            isIndoor: v.is_indoor,
            distance: null, // Only show real distance if GPS coordinate matches are implemented
            slotsCount,
            friendPlayed: false,
            peakHours,
          }
        })
        setAllVenues(mappedVenues)
      }
      setLoading(false)
    }

    fetchVenues()
  }, [])

  const filteredVenues = allVenues.filter((v) => {
    // Search filter
    if (
      search &&
      !v.name.toLowerCase().includes(search.toLowerCase()) &&
      !v.area.toLowerCase().includes(search.toLowerCase())
    )
      return false

    // Type filter
    if (typeFilter === 'INDOOR' && !v.isIndoor) return false
    if (typeFilter === 'OUTDOOR' && v.isIndoor) return false

    // Price filter
    if (priceFilter === 'LOW' && v.price >= 1000) return false
    if (priceFilter === 'HIGH' && v.price < 1000) return false

    return true
  })

  return (
    <main className="min-h-screen bg-[#060d06] text-white">
      {/* Hero strip */}
      <div className="bg-gradient-to-r from-green-950/20 via-black to-black border-b border-white/8 px-8 py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_120%,rgba(34,197,94,0.05),transparent_50%)] pointer-events-none" />
        <p className="text-xs text-green-400 font-semibold tracking-widest uppercase mb-1">
          {displayLocation}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Cricket Boxes Near You</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {filteredVenues.length} premium venues available · Updated just now
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by venue or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-green-500/50 outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500/50 outline-none appearance-none cursor-pointer"
            >
              <option value="ALL" className="text-black">
                All Types
              </option>
              <option value="INDOOR" className="text-black">
                Indoor Only
              </option>
              <option value="OUTDOOR" className="text-black">
                Outdoor Only
              </option>
            </select>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500/50 outline-none appearance-none cursor-pointer"
            >
              <option value="ALL" className="text-black">
                Any Price
              </option>
              <option value="LOW" className="text-black">
                Under ₹1000
              </option>
              <option value="HIGH" className="text-black">
                ₹1000 & Above
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
          {filteredVenues.map((v) => (
            <Link
              href={`/venues/${v.id}`}
              key={v.id}
              className="group rounded-2xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-all duration-300 overflow-hidden cursor-pointer block hover:shadow-xl hover:shadow-black/50"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden bg-black/40">
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Left Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {v.badge && (
                    <span className="px-3 py-1 rounded bg-green-500 text-black text-[10px] font-extrabold uppercase tracking-wider shadow-lg shadow-green-950/20">
                      {v.badge}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded bg-green-500/10 backdrop-blur-md border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                    Open Now
                  </span>
                </div>

                {/* Pricing Badge */}
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-sm text-white text-sm font-extrabold font-mono border border-white/10">
                  ₹{v.price.toLocaleString()}
                  <span className="text-gray-400 font-normal text-[10px]">/hr</span>
                </span>

                {/* Friend Played Banner */}
                {v.friendPlayed && (
                  <div className="absolute bottom-3 left-4 text-[10px] text-green-400 flex items-center gap-1.5 bg-green-950/60 backdrop-blur-md px-2 py-0.5 rounded border border-green-500/20 font-medium">
                    <span>👥 Friend played here recently</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
                      {v.name}
                    </h2>
                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold flex-shrink-0">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      {v.rating ? (
                        <>
                          {v.rating}
                          <span className="text-gray-500 font-normal text-[10px]">
                            ({v.reviews})
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-normal text-xs">New</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-green-400" />
                      {v.distance ? `${v.distance} km · ` : ''}
                      {v.area}
                    </span>
                  </div>
                </div>

                {/* Available Slots */}
                <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl border border-white/5 text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-green-400" /> Peak: {v.peakHours}
                  </span>
                  <span className="text-green-400 font-bold">{v.slotsCount} Slots Left</span>
                </div>

                {/* Amenities */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
                  {v.amenities.map((a: string) => {
                    const Icon = amenityIcons[a] || Zap
                    return (
                      <span
                        key={a}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 border border-white/5"
                      >
                        <Icon className="w-3.5 h-3.5 text-green-400" />
                        {a}
                      </span>
                    )
                  })}
                </div>

                <div className="w-full py-3 rounded-xl bg-white/5 hover:bg-green-500 hover:text-black border border-white/8 hover:border-green-500 text-white font-bold transition-all text-xs text-center block">
                  Book Now
                </div>
              </div>
            </Link>
          ))}

          {loading && (
            <div className="col-span-full py-20 text-center text-green-400">Loading venues...</div>
          )}

          {!loading && filteredVenues.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <Filter className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">No venues found</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
