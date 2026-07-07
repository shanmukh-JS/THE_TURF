'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  XCircle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Eye,
  FileText,
  Clock,
  X,
  CreditCard,
  User,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [commissionPct, setCommissionPct] = useState(10)

  // Sorting
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Drawer
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState<{
    booking: any
    action: 'CANCEL' | 'REFUND'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
    fetchCommissionPct()
  }, [])

  async function fetchBookings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        users(email),
        venues(name, owner_profiles(full_name)),
        slots(date, start_time, end_time)
      `
      )
      .order('created_at', { ascending: false })

    if (data) setBookings(data)
    setLoading(false)
  }

  async function fetchCommissionPct() {
    const { data } = await supabase.from('admin_settings').select('commission_percentage').single()
    if (data) setCommissionPct(Number(data.commission_percentage))
  }

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () =>
        fetchBookings()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { booking, action } = confirmModal
    const newStatus = action === 'CANCEL' ? 'CANCELLED' : 'REFUNDED'

    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id)

    if (!bookingError) {
      if (booking.slot_id) {
        await supabase
          .from('slots')
          .update({ is_booked: false, status: 'Available' })
          .eq('id', booking.slot_id)
      }

      await logAdminAction(
        `Booking ${newStatus}`,
        'bookings',
        booking.id,
        `Booking ID ${booking.id} set to ${newStatus} by admin`
      )

      fetchBookings()
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking((prev: any) => (prev ? { ...prev, status: newStatus } : null))
      }
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  // Filter & Sort
  const processedBookings = useMemo(() => {
    let result = [...bookings]

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          b.users?.email?.toLowerCase().includes(query) ||
          b.venues?.name?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [bookings, searchQuery, statusFilter, sortField, sortOrder])

  // Paginated chunk
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedBookings.slice(start, start + itemsPerPage)
  }, [processedBookings, currentPage])

  const totalPages = Math.ceil(processedBookings.length / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Customer', 'Turf Name', 'Amount', 'Date', 'Status']
    const rows = processedBookings.map((b) => [
      b.id,
      b.users?.email || 'N/A',
      b.venues?.name || 'N/A',
      b.total_amount,
      b.slots?.date || '—',
      b.status,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `truf_bookings.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-6">
      {/* Header */}
      <DashboardAnimationItem className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review all system bookings, handle refunds, or execute cancellations.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </DashboardAnimationItem>

      {/* Filters & Search */}
      <DashboardAnimationItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <option value="CONFIRMED" className="text-black">
            Confirmed
          </option>
          <option value="COMPLETED" className="text-black">
            Completed
          </option>
          <option value="CANCELLED" className="text-black">
            Cancelled
          </option>
          <option value="REFUNDED" className="text-black">
            Refunded
          </option>
        </select>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by ID, customer email or turf..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </DashboardAnimationItem>

      {/* Table */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading bookings list...</p>
          </div>
        ) : processedBookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">No bookings recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('id')}
                  >
                    ID {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Turf Name</th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    Date {sortField === 'created_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-200">
                {paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400 max-w-[120px] truncate">
                      {b.id}
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">
                      {b.users?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-semibold">{b.venues?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Owner: {b.venues?.owner_profiles?.full_name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {b.slots?.date ? (
                        <>
                          <p className="text-white font-medium">{b.slots.date}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Created: {new Date(b.created_at).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        new Date(b.created_at).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED' || b.status === 'COMPLETED'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : b.status === 'CANCELLED'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">
                      ₹{b.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/15 transition-all text-gray-300"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => setConfirmModal({ booking: b, action: 'CANCEL' })}
                            className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setConfirmModal({ booking: b, action: 'REFUND' })}
                            className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition-all"
                          >
                            Refund
                          </button>
                        </>
                      )}
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

      {/* BOOKING DETAILS DRAWER */}
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
              <h3 className="text-lg font-bold text-white">Booking Sheet</h3>
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-md font-bold text-green-400 border border-green-500/10">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedBooking.users?.email}</p>
                  <p className="text-xs text-gray-500">Customer Account</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Turf Name
                  </p>
                  <p className="text-xs font-semibold text-white">{selectedBooking.venues?.name}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Owner
                  </p>
                  <p className="text-xs font-semibold text-white">
                    {selectedBooking.venues?.owner_profiles?.full_name}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Date
                  </p>
                  <p className="text-xs font-semibold text-white">
                    {selectedBooking.slots?.date || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Status
                  </p>
                  <span
                    className={`text-xs font-semibold ${selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'COMPLETED' ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              {/* Commission Calculations */}
              <div className="rounded-xl bg-white/5 border border-white/8 p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Ledger Details
                </h4>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Gross Paid</span>
                  <span className="font-semibold text-white">₹{selectedBooking.total_amount}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Platform Fee ({commissionPct}%)</span>
                  <span className="font-semibold text-green-400">
                    ₹{(selectedBooking.total_amount * commissionPct) / 100}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-bold">
                  <span className="text-white">Owner Earnings</span>
                  <span className="text-white">
                    ₹{selectedBooking.total_amount * (1 - commissionPct / 100)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Booking ID
                </p>
                <p className="text-xs font-mono text-gray-300 select-all">{selectedBooking.id}</p>
              </div>

              {/* Quick Actions */}
              {selectedBooking.status === 'CONFIRMED' && (
                <div className="pt-4 border-t border-white/8 space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Manage Booking
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setConfirmModal({ booking: selectedBooking, action: 'CANCEL' })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={() =>
                        setConfirmModal({ booking: selectedBooking, action: 'REFUND' })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/10 transition-all"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Refund
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Booking Action
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to perform action{' '}
              <strong className="text-red-400">{confirmModal.action}</strong> on this booking?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors"
              >
                Go Back
              </button>
              <button
                disabled={actionLoading}
                onClick={handleUpdateStatus}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-2"
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
