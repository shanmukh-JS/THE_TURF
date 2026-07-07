'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Edit3,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  Star,
  BarChart3,
} from 'lucide-react'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

const statusMap = {
  APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Live' },
  UNDER_REVIEW: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    label: 'Under Review',
  },
  DRAFT: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Draft' },
}

export default function OwnerVenuesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Owner profile ID
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null)

  // Edit Modal States
  const [editingVenue, setEditingVenue] = useState<any | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    pitches: '1',
    isIndoor: false,
    turfType: 'Artificial Grass',
    address: '',
    pricePerHour: '',
  })

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchVenues = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let profile = null
    const { data: existingProfile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      const { data: newProfile } = await supabase
        .from('owner_profiles')
        .insert({
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'Owner',
          business_name: 'My Turf Business',
        })
        .select('id')
        .single()
      profile = newProfile
    } else {
      profile = existingProfile
    }

    if (!profile) {
      setLoading(false)
      return
    }
    setOwnerProfileId(profile.id)

    // Fetch venues with pricing and images
    const { data: realVenues } = await supabase
      .from('venues')
      .select(
        `
        *,
        venue_pricing(price),
        venue_images(url, is_cover)
      `
      )
      .eq('owner_id', profile.id)

    if (realVenues && realVenues.length > 0) {
      const venueIds = realVenues.map((v: any) => v.id)
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch today's bookings for all venues
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('id, venue_id, total_amount, status, slots(date)')
        .in('venue_id', venueIds)

      // Fetch today's slots for occupancy
      const { data: todaySlots } = await supabase
        .from('slots')
        .select('id, venue_id, is_booked')
        .in('venue_id', venueIds)
        .eq('date', todayStr)

      // Fetch ratings
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('venue_id, rating')
        .in('venue_id', venueIds)

      const formatted = realVenues.map((v: any) => {
        // Cover image
        const coverImage =
          v.venue_images?.find((img: any) => img.is_cover)?.url || v.venue_images?.[0]?.url || null

        // Today's stats
        const venueBookingsToday = (todayBookings || []).filter((b: any) => {
          const slot = b.slots && !Array.isArray(b.slots) ? b.slots : null
          return (
            b.venue_id === v.id &&
            slot?.date === todayStr &&
            (b.status === 'CONFIRMED' || b.status === 'COMPLETED')
          )
        })
        const bookingsToday = venueBookingsToday.length
        const revenueToday = venueBookingsToday.reduce(
          (sum: number, b: any) => sum + Number(b.total_amount),
          0
        )

        // Occupancy
        const venueSlots = (todaySlots || []).filter((s: any) => s.venue_id === v.id)
        const bookedSlots = venueSlots.filter((s: any) => s.is_booked)
        const occupancy =
          venueSlots.length > 0 ? Math.round((bookedSlots.length / venueSlots.length) * 100) : 0

        // Rating
        const venueReviews = (allReviews || []).filter((r: any) => r.venue_id === v.id)
        const avgRating =
          venueReviews.length > 0
            ? Number(
                (
                  venueReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
                  venueReviews.length
                ).toFixed(1)
              )
            : 0

        return {
          id: v.id,
          name: v.name,
          description: v.description || '',
          address: v.address,
          turfType: v.turf_type || 'Artificial Grass',
          pitches: v.pitches || 1,
          isIndoor: v.is_indoor || false,
          pricePerHour: Array.isArray(v.venue_pricing)
            ? (v.venue_pricing[0] as any)?.price || 1000
            : (v.venue_pricing as any)?.price || 1000,
          coverImage,
          rating: avgRating,
          reviewCount: venueReviews.length,
          bookingsToday,
          revenueToday,
          occupancy,
          status: v.verification_status || 'DRAFT',
        }
      })
      setVenues(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVenues()
  }, [])

  // Delete Venue
  const handleDeleteVenue = async (venueId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this venue? This will permanently delete all associated images, slots, and pricing details.'
      )
    )
      return

    const { error } = await supabase.from('venues').delete().eq('id', venueId)

    if (error) {
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({ message: 'Venue deleted successfully.', type: 'success' })
      setVenues((prev) => prev.filter((v) => v.id !== venueId))
    }
  }

  // Edit form opening
  const handleOpenEdit = (v: any) => {
    setEditingVenue(v)
    setEditFormData({
      name: v.name,
      description: v.description,
      pitches: v.pitches.toString(),
      isIndoor: v.isIndoor,
      turfType: v.turfType,
      address: v.address,
      pricePerHour: v.pricePerHour.toString(),
    })
  }

  // Edit Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVenue) return

    setEditSubmitting(true)
    try {
      // 1. Update Venue
      const { error: venueError } = await supabase
        .from('venues')
        .update({
          name: editFormData.name,
          description: editFormData.description,
          pitches: parseInt(editFormData.pitches),
          is_indoor: editFormData.isIndoor,
          turf_type: editFormData.turfType,
          address: editFormData.address,
        })
        .eq('id', editingVenue.id)

      if (venueError) throw venueError

      // 2. Update/Upsert Pricing
      const { error: pricingError } = await supabase.from('venue_pricing').upsert(
        {
          venue_id: editingVenue.id,
          price: Number(editFormData.pricePerHour),
        },
        { onConflict: 'venue_id' }
      )

      if (pricingError) throw pricingError

      setToast({ message: 'Venue details updated successfully.', type: 'success' })
      setEditingVenue(null)
      fetchVenues() // reload list
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating venue.', type: 'error' })
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Venues</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all your cricket box listings.</p>
        </div>
        <Link
          href="/owner/venues/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-lg shadow-green-900/30"
        >
          <Plus className="w-4 h-4" /> Add New Venue
        </Link>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        {loading ? (
          <div className="py-20 text-center text-gray-500 animate-pulse">Loading venues...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {venues.map((v) => {
              const s = statusMap[v.status as keyof typeof statusMap] || statusMap.DRAFT
              const Icon = s.icon
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all overflow-hidden group flex flex-col justify-between hover:-translate-y-[2px] hover:shadow-xl hover:shadow-black/30"
                >
                  <div>
                    {/* Cover Image */}
                    <div className="h-36 overflow-hidden relative bg-neutral-900 flex items-center justify-center">
                      <img
                        src={
                          v.coverImage ||
                          'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=640&auto=format&fit=crop'
                        }
                        alt={v.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Status badge on image */}
                      <span
                        className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${s.color} ${s.bg}`}
                      >
                        <Icon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors">
                            {v.name}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate max-w-[200px]">
                            <MapPin className="w-3 h-3" />
                            {v.address}
                          </p>
                        </div>
                      </div>

                      {/* Live Stats Grid */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-xl bg-white/5 border border-white/8 px-2 py-2 text-center">
                          <p className="text-sm font-bold text-white">{v.bookingsToday}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Today</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/8 px-2 py-2 text-center">
                          <p className="text-sm font-bold text-green-400">
                            ₹
                            {v.revenueToday > 999
                              ? `${(v.revenueToday / 1000).toFixed(1)}k`
                              : v.revenueToday}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Revenue</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/8 px-2 py-2 text-center">
                          <p
                            className={`text-sm font-bold ${v.occupancy >= 70 ? 'text-green-400' : v.occupancy >= 30 ? 'text-amber-400' : 'text-gray-400'}`}
                          >
                            {v.occupancy}%
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Occupied</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/8 px-2 py-2 text-center">
                          <p className="text-sm font-bold text-amber-400">
                            {v.rating > 0 ? `${v.rating}★` : '—'}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Rating</p>
                        </div>
                      </div>

                      {/* Price info */}
                      <div className="rounded-xl bg-green-500/5 border border-green-500/15 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Pricing</span>
                        <span className="text-sm font-bold text-green-400">
                          ₹{v.pricePerHour.toLocaleString()}/hr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0">
                    <div className="flex gap-2 pt-1 border-t border-white/5 mt-2">
                      <Link
                        href={`/venues/${v.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-gray-300 text-xs font-medium hover:text-white hover:border-white/20 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVenue(v.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add New Venue Card */}
            <Link
              href="/owner/venues/new"
              className="rounded-2xl border border-dashed border-white/15 hover:border-green-500/40 bg-transparent hover:bg-green-500/5 transition-all flex flex-col items-center justify-center min-h-[280px] gap-3 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 group-hover:border-green-500/40 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                  Add New Venue
                </p>
                <p className="text-xs text-gray-600 mt-1">List another cricket box</p>
              </div>
            </Link>
          </div>
        )}
      </DashboardAnimationItem>

      {/* EDIT VENUE MODAL */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-green-400" />
                Edit Venue Details
              </h2>
              <button
                onClick={() => setEditingVenue(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditSubmit}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs text-gray-500 mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Number of Pitches/Courts
                  </label>
                  <select
                    value={editFormData.pitches}
                    onChange={(e) => setEditFormData({ ...editFormData, pitches: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} className="text-black bg-white">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Turf Type</label>
                  <select
                    value={editFormData.turfType}
                    onChange={(e) => setEditFormData({ ...editFormData, turfType: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  >
                    <option value="Artificial Grass" className="text-black bg-white">
                      Artificial Grass
                    </option>
                    <option value="Natural Grass" className="text-black bg-white">
                      Natural Grass
                    </option>
                    <option value="Clay Court" className="text-black bg-white">
                      Clay Court
                    </option>
                    <option value="Hard Court" className="text-black bg-white">
                      Hard Court
                    </option>
                    <option value="Indoor Wooden" className="text-black bg-white">
                      Indoor Wooden
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Price Per Hour (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editFormData.pricePerHour}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, pricePerHour: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="editIsIndoor"
                    checked={editFormData.isIndoor}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, isIndoor: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 bg-transparent"
                  />
                  <label
                    htmlFor="editIsIndoor"
                    className="text-sm font-medium text-white cursor-pointer select-none"
                  >
                    Indoor Venue
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Complete Address</label>
                <textarea
                  required
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-lg shadow-green-900/30 disabled:opacity-55"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
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
    </DashboardAnimationWrapper>
  )
}
