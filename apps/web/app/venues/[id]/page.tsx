/* eslint-disable @next/next/no-img-element */
import { MapPin, Star, Clock, Zap, Shield, ChevronRight } from 'lucide-react'
import { ImageCarousel } from '@/components/venues/ImageCarousel'

// In production, this would fetch from the API: /api/v1/venues/:id
const venue = {
  id: 'v1',
  name: 'Olympia Turf',
  description:
    "Olympia Turf is Hyderabad's premier indoor cricket box featuring professional-grade synthetic turf, professional floodlights, and world-class facilities. Ideal for corporate matches, friendly games, and weekend sessions.",
  area: 'Madhapur',
  city: 'Hyderabad',
  lat: 17.4486,
  lng: 78.3908,
  rating: 4.9,
  reviews: 128,
  price: 1200,
  pitches: 2,
  isIndoor: true,
  images: [
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=1949&auto=format&fit=crop',
  ],
  amenities: ['Parking', 'WiFi', 'Floodlights', 'Changing Rooms', 'Water Dispenser'],
  rules: [
    'No metal spikes allowed',
    'Booking must be cancelled 2 hrs before slot',
    'Maximum 12 players per booking',
  ],
  owner: { name: 'Rajesh Kumar', memberSince: '2025' },
}

const reviews = [
  {
    id: 'r1',
    name: 'Arjun M.',
    rating: 5,
    comment: 'Best turf in Hyderabad. Lights are great for evening play!',
    date: 'Jul 2026',
  },
  {
    id: 'r2',
    name: 'Sneha R.',
    rating: 4,
    comment: 'Great pitch quality. The indoor facility is perfect for summer.',
    date: 'Jun 2026',
  },
  {
    id: 'r3',
    name: 'Kiran B.',
    rating: 5,
    comment: 'Booked for my company team. Absolutely worth it!',
    date: 'Jun 2026',
  },
]

export async function generateMetadata() {
  return {
    title: `${venue.name} — Cricket Box Booking | TRUF GAMING`,
    description: venue.description,
    openGraph: {
      title: `${venue.name} | TRUF GAMING`,
      description: venue.description,
      images: [venue.images[0]],
    },
  }
}

export default function VenueDetailPage() {
  return (
    <main className="min-h-screen bg-[#060d06] text-white">
      {/* Image Gallery */}
      <ImageCarousel images={venue.images} />

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <span>Cricket Boxes</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{venue.city}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white">{venue.name}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{venue.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <strong className="text-white">{venue.rating}</strong> ({venue.reviews} reviews)
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

          {/* Description */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold mb-3">About this venue</h2>
            <p className="text-gray-300 leading-relaxed">{venue.description}</p>
          </div>

          {/* Amenities */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold mb-4">Amenities</h2>
            <div className="grid grid-cols-2 gap-3">
              {venue.amenities.map((a) => (
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
              {venue.rules.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-amber-400 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold mb-5">
              Reviews{' '}
              <span className="text-gray-400 text-base font-normal ml-1">({venue.reviews})</span>
            </h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-600/30 flex items-center justify-center text-sm font-bold text-green-300">
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.date}</p>
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
          </div>
        </div>

        {/* Right — Booking Card */}
        <div className="sticky top-6 h-fit">
          <div className="rounded-2xl border border-green-500/20 bg-white/[0.03] p-6 space-y-5 shadow-2xl shadow-green-900/20">
            <div>
              <span className="text-3xl font-bold text-white">₹{venue.price.toLocaleString()}</span>
              <span className="text-gray-400 text-sm ml-1">/ hour</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <strong className="text-white">{venue.rating}</strong> · {venue.reviews} reviews
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <input
                  type="date"
                  className="bg-transparent outline-none text-white text-sm w-full"
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Time Slot</p>
                <select className="bg-transparent outline-none text-white text-sm w-full appearance-none">
                  <option className="text-black">7:00 PM – 8:00 PM (Available)</option>
                  <option className="text-black" disabled>
                    8:00 PM – 9:00 PM (Booked)
                  </option>
                  <option className="text-black">9:00 PM – 10:00 PM (Available)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-white/8 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>₹1,200 × 1 hour</span>
                <span>₹1,200</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Advance (50%)</span>
                <span className="text-green-400">₹600 due now</span>
              </div>
              <div className="flex justify-between font-semibold text-white border-t border-white/8 pt-2 mt-2">
                <span>Total</span>
                <span>₹1,200</span>
              </div>
            </div>

            <a href={`/book/${venue.id}`}>
              <button className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-base transition-all duration-200 shadow-lg shadow-green-900/40">
                Book This Slot →
              </button>
            </a>

            <p className="text-center text-xs text-gray-500">
              No charges until confirmed · Cancel 2 hrs before
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
