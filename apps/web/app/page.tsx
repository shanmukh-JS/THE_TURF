'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react'
import { MapPin, Calendar, Clock, Search, Loader2, Navigation, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BoomerangVideoBg from '@/components/ui/BoomerangVideoBg'

export default function HomePage() {
  const supabase = createClient()
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationInput, setLocationInput] = useState('')

  const [minDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [selectedDate, setSelectedDate] = useState(minDate)

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          )
          const data = await res.json()
          const locationName =
            data.city ||
            data.locality ||
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          setLocationInput(locationName)
        } catch (e) {
          setLocationInput(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          )
        }
        setDetectingLocation(false)
      },
      (error) => {
        console.error(error)
        alert('Failed to detect location. Please type manually.')
        setDetectingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  useEffect(() => {
    const fetchVenues = async () => {
      const { data } = await supabase
        .from('venues')
        .select(
          `
          *,
          venue_pricing(price),
          venue_images(url)
        `
        )
        .eq('verification_status', 'APPROVED')

      if (data) {
        setVenues(data)
      }
      setLoading(false)
    }
    fetchVenues()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        {/* Background Boomerang Video */}
        <BoomerangVideoBg
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4"
          className="absolute inset-0 w-full h-full opacity-40 z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-[#0a0f0a] z-10" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-xl">
            Book Your Next <span className="text-primary">Innings</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl font-light">
            Premium cricket boxes, instant booking, and world-class turf experiences waiting for
            you.
          </p>

          {/* Search Glass Panel */}
          <div className="mt-8 p-4 glass-panel rounded-2xl w-full max-w-4xl flex flex-col md:flex-row gap-4 items-center">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              input[type="date"]::-webkit-calendar-picker-indicator {
                display: none !important;
                -webkit-appearance: none !important;
              }
            `,
              }}
            />
            {/* Location */}
            <div className="flex items-center flex-1 bg-black/40 rounded-lg px-4 py-3 border border-white/10 w-full justify-between">
              <div className="flex items-center flex-1">
                <MapPin className="text-primary w-5 h-5 mr-3" />
                <input
                  type="text"
                  placeholder="Where do you want to play?"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="p-1 hover:bg-white/5 rounded-lg text-primary transition-all ml-2 flex items-center justify-center disabled:opacity-50"
                title="Detect Location"
              >
                {detectingLocation ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <Navigation className="w-4.5 h-4.5" />
                )}
              </button>
            </div>

            {/* Date */}
            <div
              className="flex items-center justify-between flex-1 bg-black/40 rounded-lg px-4 py-3 border border-white/10 w-full cursor-pointer"
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input')
                if (input) {
                  try {
                    input.showPicker()
                  } catch (err) {
                    input.click()
                  }
                }
              }}
            >
              <input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-400 cursor-pointer"
              />
              <CalendarDays className="text-primary w-5 h-5 ml-3 flex-shrink-0" />
            </div>

            {/* Time */}
            <div className="flex items-center flex-1 bg-black/40 rounded-lg px-4 py-3 border border-white/10 w-full">
              <Clock className="text-primary w-5 h-5 mr-3" />
              <select className="bg-transparent border-none outline-none text-white w-full appearance-none">
                <option value="" className="text-black">
                  Any Time
                </option>
                <option value="morning" className="text-black">
                  Morning (6 AM - 12 PM)
                </option>
                <option value="evening" className="text-black">
                  Evening (4 PM - 10 PM)
                </option>
              </select>
            </div>

            {/* Search Button */}
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-all flex items-center justify-center w-full md:w-auto">
              <Search className="w-5 h-5 mr-2" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section className="w-full max-w-7xl px-4 py-20">
        <h2 className="text-3xl font-bold mb-8 text-white">Top Rated Boxes Near You</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Finding active venues near you...</p>
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No live verified turfs found. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {venues.map((v) => {
              const price = Array.isArray(v.venue_pricing)
                ? (v.venue_pricing[0] as any)?.price || 1000
                : (v.venue_pricing as any)?.price || 1000

              const image =
                Array.isArray(v.venue_images) && v.venue_images.length > 0
                  ? v.venue_images[0]?.url
                  : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800'

              return (
                <div
                  key={v.id}
                  className="group rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="h-48 bg-gray-800 overflow-hidden relative">
                    <img
                      src={image}
                      alt={v.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-primary border border-primary/20">
                      ₹{price.toLocaleString('en-IN')}/hr
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-white">{v.name}</h3>
                      <div className="flex items-center text-yellow-500 text-sm">
                        ★ {v.rating || '4.5'}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm flex items-center mb-4">
                      <MapPin className="w-4 h-4 mr-1 text-primary" /> {v.address}
                    </p>
                    <Link
                      href={`/book/${v.id}`}
                      className="block w-full text-center bg-white/5 hover:bg-primary hover:text-primary-foreground border border-white/10 py-2 rounded-lg transition-colors font-medium text-white"
                    >
                      View Availability
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
