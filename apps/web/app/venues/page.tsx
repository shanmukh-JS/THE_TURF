'use client'

import { MapPin, Star, Clock, Wifi, Car, Zap, Filter, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const amenityIcons: Record<string, React.ElementType> = { Parking: Car, WiFi: Wifi, Floodlights: Zap }

const allVenues = [
  {
    id: 'v1',
    name: 'Olympia Turf',
    area: 'Madhapur',
    city: 'Hyderabad',
    rating: 4.9,
    reviews: 128,
    price: 1200,
    pitches: 2,
    amenities: ['Parking', 'WiFi', 'Floodlights'],
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2005&auto=format&fit=crop',
    badge: 'Top Rated',
    isIndoor: true,
  },
  {
    id: 'v2',
    name: 'Downtown Cricket Box',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    rating: 4.7,
    reviews: 94,
    price: 900,
    pitches: 1,
    amenities: ['Parking', 'Floodlights'],
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop',
    badge: null,
    isIndoor: false,
  },
  {
    id: 'v3',
    name: 'Champions Arena',
    area: 'Gachibowli',
    city: 'Hyderabad',
    rating: 4.8,
    reviews: 211,
    price: 1500,
    pitches: 3,
    amenities: ['Parking', 'WiFi', 'Floodlights'],
    image: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=1949&auto=format&fit=crop',
    badge: 'Most Booked',
    isIndoor: true,
  },
]

export default function VenuesPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [priceFilter, setPriceFilter] = useState('ALL')

  const filteredVenues = allVenues.filter((v) => {
    // Search filter
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.area.toLowerCase().includes(search.toLowerCase())) return false
    
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
      <div className="bg-gradient-to-r from-green-900/30 to-black border-b border-white/8 px-8 py-8">
        <p className="text-xs text-green-400 font-semibold tracking-widest uppercase mb-1">Hyderabad</p>
        <h1 className="text-3xl font-bold">Cricket Boxes Near You</h1>
        <p className="text-gray-400 mt-1">{filteredVenues.length} venues available · Updated just now</p>
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
              <option value="ALL" className="text-black">All Types</option>
              <option value="INDOOR" className="text-black">Indoor Only</option>
              <option value="OUTDOOR" className="text-black">Outdoor Only</option>
            </select>

            <select 
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500/50 outline-none appearance-none cursor-pointer"
            >
              <option value="ALL" className="text-black">Any Price</option>
              <option value="LOW" className="text-black">Under ₹1000</option>
              <option value="HIGH" className="text-black">₹1000 & Above</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
          {filteredVenues.map((v) => (
            <Link
              href={`/venues/${v.id}`}
              key={v.id}
              className="group rounded-2xl border border-white/8 bg-white/[0.03] hover:border-green-500/30 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden cursor-pointer block"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {v.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-green-500/90 text-black text-xs font-bold shadow-lg">
                    {v.badge}
                  </span>
                )}
                <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-bold border border-white/10">
                  ₹{v.price.toLocaleString()}<span className="text-gray-400 font-normal text-xs">/hr</span>
                </span>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">{v.name}</h2>
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-semibold flex-shrink-0">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    {v.rating}
                    <span className="text-gray-500 font-normal text-xs">({v.reviews})</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {v.area}, {v.city}
                </div>

                {/* Amenities */}
                <div className="flex items-center gap-2 flex-wrap">
                  {v.amenities.map((a) => {
                    const Icon = amenityIcons[a] || Zap
                    return (
                      <span key={a} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-gray-300">
                        <Icon className="w-3 h-3 text-green-400" />
                        {a}
                      </span>
                    )
                  })}
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-gray-300">
                    <Clock className="w-3 h-3 text-green-400" />
                    {v.pitches} {v.pitches > 1 ? 'Pitches' : 'Pitch'}
                  </span>
                </div>

                <div className="w-full mt-2 py-2.5 rounded-xl bg-green-500/10 group-hover:bg-green-500 border border-green-500/30 group-hover:border-green-500 text-green-400 group-hover:text-black transition-all duration-200 text-sm font-semibold text-center block">
                  Check Availability →
                </div>
              </div>
            </Link>
          ))}
          
          {filteredVenues.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                 <Filter className="w-8 h-8 text-gray-500" />
               </div>
               <div>
                 <h3 className="text-lg font-semibold text-white">No venues found</h3>
                 <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search criteria.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
