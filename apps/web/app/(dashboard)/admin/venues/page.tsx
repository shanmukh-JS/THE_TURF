'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Search,
  Power,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  X,
  Star,
  Download,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminTurfManagementPage() {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')

  // Sorting
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Calendar Drawer
  const [calendarVenue, setCalendarVenue] = useState<any | null>(null)
  const [venueSlots, setVenueSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    venue: any
    action: 'enable' | 'disable' | 'delete'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  const fetchVenues = async () => {
    setLoading(true)
    const { data: realVenues } = await supabase
      .from('venues')
      .select(
        `
        *,
        owner_profiles(full_name, business_name),
        cities(name),
        venue_pricing(price),
        venue_images(url, is_cover)
      `
      )
      .order('id', { ascending: false })

    if (realVenues) {
      const venueIds = realVenues.map((v) => v.id)
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch bookings to count booking count and sum revenue
      const { data: bookings } = await supabase
        .from('bookings')
        .select('venue_id, total_amount, status')
        .in('venue_id', venueIds)

      // Fetch total reviews count
      const { data: reviews } = await supabase
        .from('reviews')
        .select('venue_id, rating')
        .in('venue_id', venueIds)

      const formatted = realVenues.map((v: any) => {
        const coverImage =
          v.venue_images?.find((img: any) => img.is_cover)?.url || v.venue_images?.[0]?.url || null

        const venueBookings = (bookings || []).filter(
          (b) => b.venue_id === v.id && (b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        )
        const bookingsCount = venueBookings.length
        const totalRevenue = venueBookings.reduce((sum, b) => sum + Number(b.total_amount), 0)

        const venueReviews = (reviews || []).filter((r) => r.venue_id === v.id)
        const ratingCount = venueReviews.length
        const avgRating =
          ratingCount > 0
            ? Number(
                (venueReviews.reduce((sum, r) => sum + Number(r.rating), 0) / ratingCount).toFixed(
                  1
                )
              )
            : Number(v.rating || 0)

        return {
          id: v.id,
          name: v.name,
          address: v.address,
          turfType: v.turf_type || 'Artificial Grass',
          pricePerHour: Array.isArray(v.venue_pricing)
            ? (v.venue_pricing[0] as any)?.price || 1000
            : (v.venue_pricing as any)?.price || 1000,
          coverImage,
          ownerName: v.owner_profiles?.full_name || 'N/A',
          cityName: v.cities?.name || 'N/A',
          rating: avgRating,
          reviewCount: ratingCount,
          bookingsCount,
          totalRevenue,
          verificationStatus: v.verification_status || 'PENDING',
          isDisabled: v.is_disabled || false,
        }
      })

      setVenues(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVenues()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-venues-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () =>
        fetchVenues()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch slots for the calendar drawer
  useEffect(() => {
    if (!calendarVenue) return

    async function fetchSlots() {
      setLoadingSlots(true)
      const todayStr = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('slots')
        .select('*')
        .eq('venue_id', calendarVenue.id)
        .eq('date', todayStr)
        .order('start_time', { ascending: true })

      setVenueSlots(data || [])
      setLoadingSlots(false)
    }

    fetchSlots()
  }, [calendarVenue])

  const handleConfirmAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { venue, action } = confirmModal

    if (action === 'delete') {
      const { error } = await supabase.from('venues').delete().eq('id', venue.id)
      if (!error) {
        await logAdminAction(
          'Turf Removed',
          'venues',
          venue.id,
          `Venue ${venue.name} deleted by admin`
        )
        setVenues((prev) => prev.filter((v) => v.id !== venue.id))
        if (calendarVenue?.id === venue.id) setCalendarVenue(null)
      }
    } else {
      const shouldDisable = action === 'disable'
      const { error } = await supabase
        .from('venues')
        .update({ is_disabled: shouldDisable })
        .eq('id', venue.id)

      if (!error) {
        await logAdminAction(
          shouldDisable ? 'Turf Disabled' : 'Turf Enabled',
          'venues',
          venue.id,
          `Venue disabled state updated to ${shouldDisable}`
        )
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? { ...v, isDisabled: shouldDisable } : v))
        )
        if (calendarVenue?.id === venue.id) {
          setCalendarVenue((prev: any) => (prev ? { ...prev, isDisabled: shouldDisable } : null))
        }
      }
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  // Cities list
  const cities = useMemo(() => {
    const list = new Set<string>()
    venues.forEach((v) => {
      if (v.cityName) list.add(v.cityName)
    })
    return Array.from(list)
  }, [venues])

  // Filter & Sort
  const processedVenues = useMemo(() => {
    let result = [...venues]

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (v) => v.name.toLowerCase().includes(query) || v.ownerName.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const wantsDisabled = statusFilter === 'DISABLED'
      result = result.filter((v) => !!v.isDisabled === wantsDisabled)
    }

    // City filter
    if (cityFilter !== 'ALL') {
      result = result.filter((v) => v.cityName === cityFilter)
    }

    // Sorting
    result.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [venues, searchQuery, statusFilter, cityFilter, sortField, sortOrder])

  // Paginated chunk
  const paginatedVenues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedVenues.slice(start, start + itemsPerPage)
  }, [processedVenues, currentPage])

  const totalPages = Math.ceil(processedVenues.length / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = processedVenues
      .map((v) => {
        const status = v.isDisabled ? 'DISABLED' : 'ENABLED'
        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${v.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${v.ownerName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${v.cityName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${v.pricePerHour}/hr</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">★ ${v.rating > 0 ? v.rating.toFixed(1) : '—'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${v.bookingsCount}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${v.totalRevenue.toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${
              status === 'ENABLED' ? '#dcfce7; color: #15803d;' : '#fee2e2; color: #ef4444;'
            }">
              ${status}
            </span>
          </td>
        </tr>
      `
      })
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Turf Management Directory Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #10b981; text-transform: uppercase; }
            .title { font-size: 18px; font-weight: bold; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background: #f4f4f5; text-align: left; padding: 12px 10px; font-weight: 600; border-bottom: 2px solid #ddd; }
            .footer { margin-top: 40px; font-size: 11px; color: #71717a; text-align: center; border-top: 1px solid #e4e4e7; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">TURF GAMING</div>
            <div class="title">Turf Directory Report</div>
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
            Generated on: ${new Date().toLocaleString()} | Total Turfs: ${processedVenues.length}
          </p>
          <table>
            <thead>
              <tr>
                <th>Turf Name</th>
                <th>Owner</th>
                <th>City</th>
                <th>Price/Hr</th>
                <th>Rating</th>
                <th>Bookings</th>
                <th>Total Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            © ${new Date().getFullYear()} TURF GAMING Super Admin Portal. Confidential Document.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-6">
      {/* Header */}
      <DashboardAnimationItem className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Turf Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            Enable, disable, search, and audit all listings on TURF GAMING.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </DashboardAnimationItem>

      {/* Stats and Search */}
      <DashboardAnimationItem className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div className="flex items-center gap-2 bg-green-500/10 px-3.5 py-1.5 rounded-xl border border-green-500/20 text-green-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          {venues.filter((v) => !v.isDisabled).length} Active Turfs
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative flex-1 xl:flex-none xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by turf name or owner..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Statuses
            </option>
            <option value="ENABLED" className="text-black">
              Enabled
            </option>
            <option value="DISABLED" className="text-black">
              Disabled
            </option>
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Cities
            </option>
            {cities.map((city) => (
              <option key={city} value={city} className="text-black">
                {city}
              </option>
            ))}
          </select>
        </div>
      </DashboardAnimationItem>

      {/* Grid List */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading turfs...</p>
          </div>
        ) : processedVenues.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No turfs found matching this criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    Turf {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('ownerName')}
                  >
                    Owner {sortField === 'ownerName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">City</th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('pricePerHour')}
                  >
                    Price/Hr {sortField === 'pricePerHour' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Stats</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-200">
                {paginatedVenues.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
                        <img
                          src={
                            v.coverImage ||
                            'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=640&auto=format&fit=crop'
                          }
                          alt={v.name}
                          className="w-full h-full object-cover opacity-80"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{v.name}</p>
                        <p className="text-xs text-gray-500 font-normal mt-0.5">{v.turfType}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{v.ownerName}</td>
                    <td className="px-6 py-4 text-gray-400">{v.cityName}</td>
                    <td className="px-6 py-4 text-white font-semibold">₹{v.pricePerHour}/hr</td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{' '}
                          {v.rating > 0 ? v.rating : '—'}
                        </span>
                        <span>•</span>
                        <span>{v.bookingsCount} bookings</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {v.isDisabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/10">
                          DISABLED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/10">
                          ENABLED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setCalendarVenue(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/15 transition-all text-gray-300 hover:text-white"
                        title="Open Calendar"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Calendar
                      </button>
                      {v.isDisabled ? (
                        <button
                          onClick={() => setConfirmModal({ venue: v, action: 'enable' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                        >
                          <Power className="w-3.5 h-3.5" /> Enable
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ venue: v, action: 'disable' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Power className="w-3.5 h-3.5" /> Disable
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmModal({ venue: v, action: 'delete' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="px-3 py-1.5 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="px-3 py-1.5 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </DashboardAnimationItem>

      {/* CALENDAR DRAWER */}
      {calendarVenue && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setCalendarVenue(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0a0f0a] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Booking Calendar</h3>
              <button
                onClick={() => setCalendarVenue(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-base font-bold text-white">{calendarVenue.name}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {calendarVenue.address} · {calendarVenue.cityName}
                </p>
              </div>

              {/* Today's slots list */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Today&apos;s Slots
                </h5>
                {loadingSlots ? (
                  <div className="py-10 text-center text-xs text-gray-500">
                    Loading slots details...
                  </div>
                ) : venueSlots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-600 bg-white/5 rounded-xl border border-white/5">
                    No slots scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {venueSlots.map((slot) => {
                      const startTime = new Date(slot.start_time).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      const endTime = new Date(slot.end_time).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <div
                          key={slot.id}
                          className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-white">
                            {startTime} - {endTime}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              slot.status === 'Blocked'
                                ? 'bg-amber-500/10 text-amber-400'
                                : slot.is_booked
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            {slot.status === 'Blocked'
                              ? 'Blocked'
                              : slot.is_booked
                                ? 'Booked'
                                : 'Available'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Turf Action
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to <strong className="text-white">{confirmModal.action}</strong>{' '}
              the turf <strong className="text-white">{confirmModal.venue.name}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-500'
                    : confirmModal.action === 'disable'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
