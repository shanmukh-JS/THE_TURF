'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, XCircle, ArrowLeftRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    booking: any
    action: 'CANCEL' | 'REFUND'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
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
        slots(start_time, end_time)
      `
      )
      .order('created_at', { ascending: false })

    if (data) setBookings(data)
    setLoading(false)
  }

  const handleUpdateStatus = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { booking, action } = confirmModal
    const newStatus = action === 'CANCEL' ? 'CANCELLED' : 'REFUNDED'

    // Update booking status
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id)

    if (!bookingError) {
      // If refunded/cancelled, mark the slot as Available again
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

      // Refresh list
      fetchBookings()
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  const filteredBookings = bookings.filter((b) => {
    const customerEmail = b.users?.email || ''
    const turfName = b.venues?.name || ''
    const idString = b.id || ''
    const matchSearch =
      customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idString.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Booking Management</h1>
        <p className="text-gray-400 mt-1">
          Review all system bookings, handle refunds, or execute cancellations.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex justify-end">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by ID, customer email or turf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading bookings list...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">No bookings recorded.</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Venue & Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-200">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400 max-w-[120px] truncate">
                    {b.id}
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{b.users?.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{b.venues?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Owner: {b.venues?.owner_profiles?.full_name || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'CONFIRMED'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : b.status === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-bold">₹{b.total_amount}</td>
                  <td className="px-6 py-4 text-right space-x-2">
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
        )}
      </div>

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
              <strong className="text-red-400">{confirmModal.action}</strong> on this booking? This
              will update the booking state, notify the client, and mark the timing slot as open.
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
    </div>
  )
}
