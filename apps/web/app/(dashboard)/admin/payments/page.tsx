'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard,
  DollarSign,
  ArrowUpRight,
  Loader2,
  ShieldAlert,
  Download,
  AlertCircle,
  Clock,
  CheckCircle,
  Search,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commissionPct, setCommissionPct] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [confirmModal, setConfirmModal] = useState<{
    payment: any
    action: 'RELEASE' | 'HOLD' | 'REFUND'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const supabase = createClient()

  const fetchPayments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select(
        `
        *,
        users(email),
        venues(name, verification_status, owner_profiles(full_name))
      `
      )
      .order('created_at', { ascending: false })

    if (data) setPayments(data)
    setLoading(false)
  }

  async function fetchCommissionPct() {
    const { data } = await supabase
      .from('admin_settings')
      .select('commission_percentage')
      .limit(1)
      .maybeSingle()
    if (data) setCommissionPct(Number(data.commission_percentage))
  }

  useEffect(() => {
    fetchPayments()
    fetchCommissionPct()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () =>
        fetchPayments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdatePayout = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { payment, action } = confirmModal
    let newStatus = 'PENDING'
    if (action === 'RELEASE') newStatus = 'RELEASED'
    if (action === 'HOLD') newStatus = 'HELD'
    if (action === 'REFUND') newStatus = 'REFUNDED'

    if (action === 'RELEASE' && payment.venues?.verification_status !== 'APPROVED') {
      alert('Payout release rejected: The owner / venue is not verified!')
      setActionLoading(false)
      setConfirmModal(null)
      return
    }

    // Perform status update in Supabase
    const updatePayload: any = {}
    if (action === 'REFUND') {
      updatePayload.status = 'REFUNDED'
    }

    // We can save/log the settlement status payout_status
    updatePayload.payout_status = newStatus

    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', payment.id)

    if (!error) {
      await logAdminAction(
        `Payout status: ${newStatus}`,
        'bookings',
        payment.id,
        `Settlement state modified to ${newStatus}`
      )
      fetchPayments()
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  // Filter & Sort
  const processedPayments = useMemo(() => {
    let result = [...payments]

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(query) ||
          p.users?.email?.toLowerCase().includes(query) ||
          p.venues?.name?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => (p.payout_status || 'PENDING') === statusFilter)
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
  }, [payments, searchQuery, statusFilter, sortField, sortOrder])

  // Paginated chunk
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedPayments.slice(start, start + itemsPerPage)
  }, [processedPayments, currentPage])

  const totalPages = Math.ceil(processedPayments.length / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Summary Metrics calculations
  const grossRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === 'CONFIRMED' || p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.total_amount), 0)
  }, [payments])

  const platformEarnings = useMemo(() => {
    return (grossRevenue * commissionPct) / 100
  }, [grossRevenue, commissionPct])

  const netRevenue = useMemo(() => {
    return grossRevenue - platformEarnings
  }, [grossRevenue, platformEarnings])

  const releasedPayments = useMemo(() => {
    return payments
      .filter((p) => p.payout_status === 'RELEASED')
      .reduce((sum, p) => sum + Number(p.total_amount) * (1 - commissionPct / 100), 0)
  }, [payments, commissionPct])

  const pendingSettlements = useMemo(() => {
    return netRevenue - releasedPayments
  }, [netRevenue, releasedPayments])

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = processedPayments
      .map((p) => {
        const gross = Number(p.total_amount)
        const commission = (gross * commissionPct) / 100
        const net = gross - commission
        const status = p.payout_status || 'PENDING'
        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; font-family: monospace; font-size: 11px;">${p.id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p.users?.email || 'N/A'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${p.venues?.owner_profiles?.full_name || 'N/A'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${gross.toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${commission.toLocaleString('en-IN')} (${commissionPct}%)</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${net.toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${
              status === 'RELEASED'
                ? '#dcfce7; color: #15803d;'
                : status === 'HELD'
                  ? '#fee2e2; color: #ef4444;'
                  : '#fef3c7; color: #d97706;'
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
          <title>Payments & Revenue Ledger Report</title>
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
            <div class="title">Payments & Revenue Ledger Report</div>
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
            Generated on: ${new Date().toLocaleString()} | Total Transactions: ${processedPayments.length}
          </p>
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Owner</th>
                <th>Gross Amount</th>
                <th>Commission</th>
                <th>Net Payout</th>
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
          <h1 className="text-2xl font-bold text-white">Payments & Revenue Ledger</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review platform commission, inspect ledger entries, and manage owner payouts.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </DashboardAnimationItem>

      {/* Summary Stats cards */}
      <DashboardAnimationItem className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Gross Revenue (GMV)
          </p>
          <p className="text-xl font-bold text-white">₹{grossRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Net Owner Revenue
          </p>
          <p className="text-xl font-bold text-white">₹{netRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Platform Earnings ({commissionPct}%)
          </p>
          <p className="text-xl font-bold text-green-400">
            ₹{platformEarnings.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Released Settlements
          </p>
          <p className="text-xl font-bold text-white">
            ₹{releasedPayments.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            Pending Settlements
          </p>
          <p className="text-xl font-bold text-amber-400">
            ₹{pendingSettlements.toLocaleString('en-IN')}
          </p>
        </div>
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
            All Payout Statuses
          </option>
          <option value="PENDING" className="text-black">
            Pending
          </option>
          <option value="RELEASED" className="text-black">
            Released
          </option>
          <option value="HELD" className="text-black">
            Held
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

      {/* Transaction Table */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading transactions ledger...</p>
          </div>
        ) : processedPayments.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No transaction records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('id')}
                  >
                    Transaction ID {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Owner & Turf</th>
                  <th className="px-6 py-4">Gross Amt</th>
                  <th className="px-6 py-4">Commission</th>
                  <th className="px-6 py-4">Net Payout</th>
                  <th className="px-6 py-4">Payout Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-200">
                {paginatedPayments.map((p) => {
                  const isApproved = p.venues?.verification_status === 'APPROVED'
                  const gross = Number(p.total_amount)
                  const commVal = (gross * commissionPct) / 100
                  const net = gross - commVal
                  const payoutStatus = p.payout_status || 'PENDING'

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400 max-w-[120px] truncate">
                        {p.id}
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-xs">{p.users?.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">
                          {p.venues?.owner_profiles?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.venues?.name || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">
                        ₹{gross.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-green-400">
                        ₹{commVal.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-white font-bold">
                        ₹{net.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            payoutStatus === 'RELEASED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : payoutStatus === 'HELD'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {payoutStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payoutStatus !== 'RELEASED' && (
                          <button
                            disabled={!isApproved}
                            onClick={() => setConfirmModal({ payment: p, action: 'RELEASE' })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isApproved
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black'
                                : 'bg-gray-500/10 border-gray-500/20 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!isApproved ? 'Owner is not verified' : 'Release payout'}
                          >
                            Release
                          </button>
                        )}
                        {payoutStatus === 'PENDING' && (
                          <button
                            onClick={() => setConfirmModal({ payment: p, action: 'HOLD' })}
                            className="ml-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                          >
                            Hold
                          </button>
                        )}
                        {payoutStatus === 'RELEASED' && (
                          <button
                            onClick={() => setConfirmModal({ payment: p, action: 'REFUND' })}
                            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition-all"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
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

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Payout Action
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Set payout status of transaction to{' '}
              <strong className="text-green-400">{confirmModal.action}</strong>?
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
                onClick={handleUpdatePayout}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500 text-black hover:bg-green-400 transition-colors flex items-center gap-2"
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
