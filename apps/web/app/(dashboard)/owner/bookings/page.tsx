'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  Ban,
  Phone,
  Mail,
  User,
  MapPin,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  CONFIRMED: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Confirmed',
  },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Pending' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
  COMPLETED: {
    icon: CheckCircle2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Completed',
  },
}

export default function OwnerBookingsPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null)
  const [venueIds, setVenueIds] = useState<string[]>([])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchBookings = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Remove insecure client-side admin check.
    // Ensure we are an owner and fetch only our venues.
    let profile = null
    const { data: existingProfile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      setLoading(false)
      return
    }

    profile = existingProfile
    setOwnerProfileId(profile.id)

    // Fetch bookings joined with customer_profiles and venues
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select(
        `
        id, 
        total_amount, 
        status, 
        customer_id,
        venue_id,
        created_at,
        slot_id,
        slots(date, start_time),
        venues!inner(name, owner_id),
        customer_profiles(full_name)
      `
      )
      .eq('venues.owner_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      setLoading(false)
      return
    }

    if (bookingsData && bookingsData.length > 0) {
      const vIds = Array.from(new Set(bookingsData.map((b: any) => b.venue_id)))
      setVenueIds(vIds)

      const formatted = bookingsData.map((b: any) => {
        const slot = b.slots && !Array.isArray(b.slots) ? b.slots : null
        let dateStr = 'N/A'
        let timeStr = 'N/A'

        if (slot) {
          const d = new Date(slot.date)
          dateStr = d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          if (slot.start_time) {
            timeStr = new Date(slot.start_time).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: 'numeric',
              minute: '2-digit',
            })
          }
        }

        return {
          id: b.id,
          customerName: b.customer_profiles?.full_name || 'Unknown Customer',
          customerId: b.customer_id,
          venueName: b.venues?.name || 'Unknown Venue',
          venueId: b.venue_id,
          date: dateStr,
          time: timeStr,
          amount: b.total_amount,
          status: b.status || 'PENDING',
          createdAt: b.created_at,
        }
      })

      setBookings(formatted)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  // Real-time subscription
  useEffect(() => {
    if (venueIds.length === 0) return

    const channel = supabase
      .channel('owner-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () =>
        fetchBookings()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueIds])

  // Quick Actions
  const handleMarkCompleted = async (bookingId: string) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'COMPLETED' })
      .eq('id', bookingId)

    if (error) {
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({ message: 'Booking marked as completed!', type: 'success' })
      // Optimistic update
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'COMPLETED' } : b))
      )
      setSelectedBooking(null)
    }
    setActionLoading(false)
  }

  const handleConfirmPayment = async (bookingId: string) => {
    setActionLoading(true)

    try {
      const res = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: 'CONFIRMED',
          ownerProfileId,
          notifyUser: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update booking status')
      }

      setToast({ message: 'Payment confirmed & booking updated', type: 'success' })
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b))
      )
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.'))
      return

    setActionLoading(true)
    try {
      const res = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: 'CANCELLED',
          ownerProfileId,
          notifyUser: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to cancel booking')
      }

      setToast({ message: 'Booking cancelled successfully', type: 'success' })
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
      )
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      searchQuery === '' ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading bookings...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage all your upcoming and past venue reservations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3">
          {[
            {
              label: 'Confirmed',
              count: confirmedCount,
              color: 'text-green-400 bg-green-500/10 border-green-500/15',
            },
            {
              label: 'Pending',
              count: pendingCount,
              color: 'text-amber-400 bg-amber-500/10 border-amber-500/15',
            },
            {
              label: 'Completed',
              count: completedCount,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/15',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${s.color}`}
            >
              {s.count} {s.label}
            </div>
          ))}
        </div>
      </DashboardAnimationItem>

      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            All Bookings ({filteredBookings.length})
          </h2>

          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search customer, venue or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
            >
              <option value="ALL" className="text-black">
                All Statuses
              </option>
              <option value="CONFIRMED" className="text-black">
                Confirmed
              </option>
              <option value="PENDING" className="text-black">
                Pending
              </option>
              <option value="COMPLETED" className="text-black">
                Completed
              </option>
              <option value="CANCELLED" className="text-black">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
                <CalendarCheck className="w-7 h-7 text-green-400/60" />
              </div>
              <p className="text-white font-medium">
                {bookings.length === 0 ? 'No bookings found' : 'No bookings match your search'}
              </p>
              <p className="text-gray-500 text-sm mt-1.5 max-w-xs">
                {bookings.length === 0
                  ? 'Your bookings will appear here once customers reserve your venues.'
                  : 'Try adjusting your search query or filters.'}
              </p>
            </div>
          ) : (
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Customer
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Venue
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b) => {
                  const s = statusConfig[b.status] ?? statusConfig['PENDING']!
                  const StatusIcon = s.icon

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-sm font-bold text-green-400 border border-green-500/10">
                            {b.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                              {b.customerName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              #{b.id.split('-')[0]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">{b.venueName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-300">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {b.date}
                          <span className="text-gray-500 mx-1">•</span>
                          <span className="font-medium text-white">{b.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white">
                          ₹{b.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color} ${s.bg}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {b.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleMarkCompleted(b.id)}
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Mark Completed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {b.status === 'PENDING' && (
                            <button
                              onClick={() => handleConfirmPayment(b.id)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title="Accept Booking"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Cancel Booking"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DashboardAnimationItem>

      {/* ═══════════════════════════════════════════════════════════════
          SLIDE-OVER DETAIL PANEL
         ═══════════════════════════════════════════════════════════════ */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0a0f0a] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-xl font-bold text-green-400 border border-green-500/10">
                  {selectedBooking.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{selectedBooking.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedBooking.venueName}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Date
                  </p>
                  <p className="text-sm font-semibold text-white">{selectedBooking.date}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Time
                  </p>
                  <p className="text-sm font-semibold text-white">{selectedBooking.time}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Amount
                  </p>
                  <p className="text-sm font-semibold text-green-400">
                    ₹{selectedBooking.amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold ${statusConfig[selectedBooking.status]?.color || 'text-gray-400'}`}
                  >
                    {statusConfig[selectedBooking.status]?.label || selectedBooking.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Booking ID
                </p>
                <p className="text-xs font-mono text-gray-300">{selectedBooking.id}</p>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-white/8 space-y-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Quick Actions
                </p>

                {selectedBooking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleMarkCompleted(selectedBooking.id)}
                    disabled={actionLoading}
                    className="flex-1 w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all"
                  >
                    Mark as Completed
                  </button>
                )}
                {selectedBooking.status === 'PENDING' && (
                  <button
                    onClick={() => handleConfirmPayment(selectedBooking.id)}
                    disabled={actionLoading}
                    className="flex-1 w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-semibold text-sm transition-all"
                  >
                    Accept Booking
                  </button>
                )}
                {(selectedBooking.status === 'CONFIRMED' ||
                  selectedBooking.status === 'PENDING') && (
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    <Ban className="w-4 h-4" /> Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 fade-in duration-300">
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
