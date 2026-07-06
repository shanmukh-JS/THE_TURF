'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard,
  DollarSign,
  ArrowUpRight,
  HelpCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commissionPct, setCommissionPct] = useState(10)
  const [confirmModal, setConfirmModal] = useState<{
    payment: any
    action: 'RELEASE' | 'HOLD'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchPayments()
    fetchCommissionPct()
  }, [])

  async function fetchPayments() {
    setLoading(true)
    // Query payments from bookings (representing customer transactions and payouts)
    const { data } = await supabase
      .from('bookings')
      .select(
        `
        *,
        users(email),
        venues(name, verification_status, owner_profiles(full_name, id))
      `
      )
      .order('created_at', { ascending: false })

    if (data) setPayments(data)
    setLoading(false)
  }

  async function fetchCommissionPct() {
    const { data } = await supabase.from('admin_settings').select('commission_percentage').single()
    if (data) setCommissionPct(Number(data.commission_percentage))
  }

  const handleUpdatePayout = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { payment, action } = confirmModal
    const newStatus = action === 'RELEASE' ? 'RELEASED' : 'HELD'

    // Verify if owner is approved first
    if (action === 'RELEASE' && payment.venues?.verification_status !== 'APPROVED') {
      alert('Payout release rejected: The owner / venue is not verified!')
      setActionLoading(false)
      setConfirmModal(null)
      return
    }

    // Since we don't have a payout_status column in bookings, let's mock the update (or add a column if we want,
    // but updating local state and logging is enough for the MVP flow, or we can store it in raw metadata or logs)
    await logAdminAction(
      `Payout status updated: ${newStatus}`,
      'bookings_payout',
      payment.id,
      `Payout for booking ID ${payment.id} set to ${newStatus}`
    )

    // Update local list payout status representation
    setPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? { ...p, payout_status: newStatus } : p))
    )

    setActionLoading(false)
    setConfirmModal(null)
  }

  // Calculation Metrics
  const totalGMV = payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.total_amount), 0)
  const platformRevenue = (totalGMV * commissionPct) / 100
  const ownerEarnings = totalGMV - platformRevenue

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payments & Payouts</h1>
        <p className="text-gray-400 mt-1">
          Review platform commission, inspect ledger entries, and manage owner payouts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0c120c] border border-white/10 rounded-2xl p-6 space-y-2">
          <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold tracking-wider">
            <span>Total Collected (GMV)</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{totalGMV.toLocaleString()}</p>
        </div>

        <div className="bg-[#0c120c] border border-white/10 rounded-2xl p-6 space-y-2">
          <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold tracking-wider">
            <span>Platform Commission ({commissionPct}%)</span>
            <ArrowUpRight className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">₹{platformRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#0c120c] border border-white/10 rounded-2xl p-6 space-y-2">
          <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold tracking-wider">
            <span>Owner Net Earnings</span>
            <CreditCard className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{ownerEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading financial records...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No transaction history found.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Owner Name</th>
                <th className="px-6 py-4">Turf Name</th>
                <th className="px-6 py-4">Net Amount</th>
                <th className="px-6 py-4">Payout Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-200">
              {payments.map((p) => {
                const isApproved = p.venues?.verification_status === 'APPROVED'
                const net = Number(p.total_amount) * (1 - commissionPct / 100)
                const payoutStatus = p.payout_status || 'PENDING'

                return (
                  <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400 max-w-[120px] truncate">
                      {p.id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {p.venues?.owner_profiles?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{p.venues?.name || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-white">₹{net.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          payoutStatus === 'RELEASED'
                            ? 'bg-green-500/10 text-green-400'
                            : payoutStatus === 'HELD'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-amber-500/10 text-amber-400'
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

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
              Are you sure you want to set payout status of this transaction to{' '}
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
    </div>
  )
}
