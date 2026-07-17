'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedRefund, setSelectedRefund] = useState<any | null>(null)
  const [refundEvents, setRefundEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [reasonInput, setReasonInput] = useState('')
  const [showForceModal, setShowForceModal] = useState<'COMPLETE' | 'FAIL' | null>(null)

  const supabase = createClient()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchRefunds = async () => {
    setLoading(true)
    // Query refunds table, joining bookings and related venue/user details
    const { data, error } = await supabase
      .from('refunds')
      .select(
        `
        *,
        bookings(
          customer_id,
          total_amount,
          advance_paid,
          venues(name)
        )
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching refunds:', error)
      setToast({ message: 'Failed to load refunds records.', type: 'error' })
    } else {
      setRefunds(data || [])
    }
    setLoading(false)
  }

  // Fetch refund events for selected refund
  const fetchRefundEvents = async (refundId: string) => {
    setLoadingEvents(true)
    const { data, error } = await supabase
      .from('refund_events')
      .select('*')
      .eq('refund_id', refundId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setRefundEvents(data)
    } else {
      setRefundEvents([])
    }
    setLoadingEvents(false)
  }

  useEffect(() => {
    fetchRefunds()
  }, [])

  // Real-time subscription to refunds table
  useEffect(() => {
    const channel = supabase
      .channel('admin-refunds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => {
        fetchRefunds()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Action: Retry worker job
  const handleRetryRefund = async (refundId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/refunds/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to retry refund worker')

      setToast({ message: 'Refund worker job re-enqueued successfully.', type: 'success' })
      fetchRefunds()
      if (selectedRefund && selectedRefund.id === refundId) {
        setSelectedRefund(null)
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Force Complete
  const handleForceComplete = async () => {
    if (!selectedRefund) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/refunds/force-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId: selectedRefund.id, reason: reasonInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to force complete refund')

      setToast({ message: 'Refund force completed and ledger entries posted.', type: 'success' })
      fetchRefunds()
      setSelectedRefund(null)
      setShowForceModal(null)
      setReasonInput('')
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Action: Force Fail
  const handleForceFail = async () => {
    if (!selectedRefund) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/refunds/force-fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundId: selectedRefund.id, reason: reasonInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to force fail refund')

      setToast({ message: 'Refund marked as failed.', type: 'success' })
      fetchRefunds()
      setSelectedRefund(null)
      setShowForceModal(null)
      setReasonInput('')
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // Computed metrics
  const metrics = useMemo(() => {
    const total = refunds.length
    const processing = refunds.filter((r) => r.status === 'PROCESSING').length
    const completed = refunds.filter((r) => r.status === 'COMPLETED').length
    const failed = refunds.filter((r) => r.status === 'FAILED').length

    // Stuck processing (PROCESSING and older than 10 minutes)
    const stuck = refunds.filter((r) => {
      if (r.status !== 'PROCESSING') return false
      const updated = new Date(r.updated_at).getTime()
      const tenMinsAgo = Date.now() - 10 * 60000
      return updated < tenMinsAgo
    }).length

    return { total, processing, completed, failed, stuck }
  }, [refunds])

  // Filter & Search
  const filteredRefunds = useMemo(() => {
    let result = [...refunds]

    if (statusFilter !== 'ALL') {
      result = result.filter((r) => r.status === statusFilter)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.payment_id.toLowerCase().includes(q) ||
          (r.refund_id && r.refund_id.toLowerCase().includes(q)) ||
          r.cancellation_reason?.toLowerCase().includes(q) ||
          r.bookings?.venues?.name?.toLowerCase().includes(q)
      )
    }

    return result
  }, [refunds, statusFilter, searchQuery])

  // Paginated List
  const paginatedRefunds = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRefunds.slice(start, start + itemsPerPage)
  }, [filteredRefunds, currentPage])

  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage)

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 text-white font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl transition-all ${
            toast.type === 'success'
              ? 'bg-[#0f2a0f]/80 border-green-500/25 text-green-400'
              : 'bg-red-950/80 border-red-500/25 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <DashboardAnimationItem className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Refunds Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor cancellation refund lifecycles and manual audit operations.
          </p>
        </div>
        <button
          onClick={fetchRefunds}
          className="p-2.5 rounded-xl border border-white/8 bg-white/5 hover:bg-white/10 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4 text-gray-300" />
        </button>
      </DashboardAnimationItem>

      {/* Operational Dashboard Cards */}
      <DashboardAnimationItem className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0b100b] border border-white/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Cancellations
            </span>
            <div className="p-1.5 rounded-lg bg-white/5 text-gray-300">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3">{metrics.total}</p>
        </div>

        <div className="bg-[#0b100b] border border-white/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Active Processing
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 text-blue-400">{metrics.processing}</p>
        </div>

        <div className="bg-[#0b100b] border border-white/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Failed / Retrying
            </span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 text-red-400">{metrics.failed}</p>
        </div>

        <div className="bg-[#0b100b] border border-red-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Stuck Refund SLA (&gt;10m)
            </span>
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 text-red-400">{metrics.stuck}</p>
        </div>
      </DashboardAnimationItem>

      {/* Filtering & Table */}
      <DashboardAnimationItem className="bg-[#0b100b] border border-white/8 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by refund reference, ID..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-yellow-500/40"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 border border-white/5 bg-white/5 rounded-xl p-1 overflow-x-auto w-full md:w-auto">
            {['ALL', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  statusFilter === tab
                    ? 'bg-yellow-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table layout */}
        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading records...
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-500">
            No refund records found matching query parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="pb-3 pr-4">Refund ID</th>
                  <th className="pb-3 pr-4">Venue</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Correlation ID</th>
                  <th className="pb-3 pr-4">Initiated</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedRefunds.map((refund) => {
                  return (
                    <tr key={refund.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5 pr-4 font-mono text-[10px] text-gray-400">
                        {refund.id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-white">
                        {refund.bookings?.venues?.name || 'Truf Venue'}
                      </td>
                      <td className="py-3.5 pr-4 text-green-400 font-bold">₹{refund.amount}</td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            refund.status === 'COMPLETED'
                              ? 'bg-green-500/10 text-green-400'
                              : refund.status === 'PROCESSING'
                                ? 'bg-blue-500/10 text-blue-400'
                                : refund.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {refund.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-[10px] text-gray-500">
                        {refund.correlation_id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 pr-4 text-gray-400">
                        {new Date(refund.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRefund(refund)
                            fetchRefundEvents(refund.id)
                          }}
                          className="px-2.5 py-1.5 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-lg flex items-center gap-1 font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-5 mt-3 border-t border-white/5">
                <span className="text-[10px] text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                    className="px-3 py-1.5 bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-40 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                    className="px-3 py-1.5 bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-40 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardAnimationItem>

      {/* DETAILS & TIMELINE AUDIT MODAL */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => {
              if (!actionLoading) setSelectedRefund(null)
            }}
          />
          <div className="bg-[#0b100b] border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Refund Audit Trace</h3>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  REFID: {selectedRefund.id} | Booking: {selectedRefund.booking_id}
                </p>
              </div>
              <button
                disabled={actionLoading}
                onClick={() => setSelectedRefund(null)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Refund Meta Info */}
            <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/8 rounded-xl p-4 mb-6">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Razorpay Refund ID
                </span>
                <p className="text-xs font-mono font-semibold text-gray-200">
                  {selectedRefund.refund_id || 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Razorpay Payment ID
                </span>
                <p className="text-xs font-mono font-semibold text-gray-200">
                  {selectedRefund.payment_id}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Refund Amount
                </span>
                <p className="text-xs font-bold text-green-400">₹{selectedRefund.amount}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Correlation ID
                </span>
                <p className="text-xs font-mono text-gray-200">{selectedRefund.correlation_id}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Cancellation Reason
                </span>
                <p className="text-xs text-gray-300 italic">
                  "{selectedRefund.cancellation_reason || 'No reason provided'}"
                </p>
              </div>
            </div>

            {/* Audit Timeline */}
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                Event Timeline Trace
              </h4>
              {loadingEvents ? (
                <div className="flex gap-2 items-center text-xs text-gray-500 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching event sequence...
                </div>
              ) : refundEvents.length === 0 ? (
                <p className="text-xs text-gray-500">No events logged yet for this refund.</p>
              ) : (
                <div className="space-y-4 relative pl-4 border-l border-white/10 ml-2 text-left">
                  {refundEvents.map((evt, idx) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-yellow-500 border border-[#0b100b]" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-white uppercase">
                            {evt.event_type}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(evt.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <pre className="p-2 bg-white/5 rounded-lg text-[10px] font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-24">
                            {JSON.stringify(evt.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Override Operations */}
            <div className="border-t border-white/5 pt-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                Administrative Actions
              </h4>
              <div className="flex flex-wrap gap-3">
                {/* Reset / Retry */}
                {selectedRefund.status !== 'COMPLETED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRetryRefund(selectedRefund.id)}
                    className="px-4 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-trigger worker
                  </button>
                )}

                {/* Force complete */}
                {selectedRefund.status !== 'COMPLETED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowForceModal('COMPLETE')}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase transition-colors disabled:opacity-40"
                  >
                    Force Complete
                  </button>
                )}

                {/* Force fail */}
                {selectedRefund.status !== 'COMPLETED' && selectedRefund.status !== 'FAILED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowForceModal('FAIL')}
                    className="px-4 py-2 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black rounded-lg flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase transition-colors disabled:opacity-40"
                  >
                    Force Fail
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORCE ACTION INPUT MODAL */}
      {showForceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setShowForceModal(null)}
          />
          <div className="bg-[#0b100b] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 font-sans text-left">
            <h3 className="text-lg font-bold text-white mb-2">
              {showForceModal === 'COMPLETE' ? 'Force Complete Refund?' : 'Force Fail Refund?'}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              This is a sensitive administrative override. It will bypass checking Razorpay webhooks
              and directly commit state changes.
              {showForceModal === 'COMPLETE' &&
                ' This will also trigger Ledger Accrual Phase B entries.'}
            </p>

            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Reason / Override Note
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Specify override reasons for audit record logging..."
                className="w-full h-24 bg-white/5 border border-white/8 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 resize-none transition-colors"
                required
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowForceModal(null)
                  setReasonInput('')
                }}
                className="px-4 py-2.5 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-lg font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !reasonInput}
                onClick={showForceModal === 'COMPLETE' ? handleForceComplete : handleForceFail}
                className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-colors disabled:opacity-40 ${
                  showForceModal === 'COMPLETE'
                    ? 'bg-green-500 hover:bg-green-400 text-black'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {actionLoading ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
