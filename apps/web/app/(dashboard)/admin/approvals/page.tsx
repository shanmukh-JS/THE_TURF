'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  FileText,
  CheckSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    venue: any
    action: 'APPROVED' | 'REJECTED' | 'REQUEST_INFO'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [reason, setReason] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchApprovals()
  }, [])

  async function fetchApprovals() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(
          `
          *,
          owner_profiles(
            id, full_name, business_name, business_phone, user_id,
            owner_settings(bank_account_name, bank_account_number, bank_ifsc, bank_upi)
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching approvals:', error)
      } else if (data) {
        setApprovals(data)
      }
    } catch (err) {
      console.error('Exception fetching approvals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { venue, action } = confirmModal

    let statusText = 'PENDING'
    if (action === 'APPROVED') statusText = 'APPROVED'
    if (action === 'REJECTED') statusText = 'REJECTED'

    try {
      const { error } = await supabase
        .from('venues')
        .update({
          verification_status: statusText,
        })
        .eq('id', venue.id)

      if (!error) {
        await logAdminAction(
          `Venue Verification status: ${statusText}`,
          'venues',
          venue.id,
          `Set verification_status to ${statusText}. Reason: ${reason || 'None provided'}`
        ).catch(console.error) // Prevent audit log failure from crashing the app

        // Refresh list
        fetchApprovals()
        setSelectedVenue(null)
      } else {
        console.error('Error updating status:', error)
        alert('Failed to update status. Please try again.')
      }
    } catch (err) {
      console.error('Exception updating status:', err)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setActionLoading(false)
      setConfirmModal(null)
      setReason('')
    }
  }

  const filteredApprovals = approvals.filter((v) => {
    const ownerName = v.owner_profiles?.full_name || ''
    const turfName = v.name || ''
    const matchSearch =
      ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      turfName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  // Simulated verification checklist rules
  const getChecklist = (v: any) => {
    return {
      emailVerified: true, // Auto-verified if registered
      phoneVerified: !!v.owner_profiles?.business_phone,
      idUploaded: true, // ID proof uploaded check representation
      bankAdded:
        !!v.owner_profiles?.owner_settings?.bank_account_number ||
        !!(
          Array.isArray(v.owner_profiles?.owner_settings) &&
          v.owner_profiles?.owner_settings[0]?.bank_account_number
        ),
      imagesUploaded: true,
      addressAdded: !!v.address,
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Owner & Turf Approvals</h1>
        <p className="text-gray-400 mt-1">
          Review owner registration details and approve/reject turf publishing rights.
        </p>
      </div>

      {/* Search & Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Clock className="w-4 h-4" />
            {approvals.filter((a) => a.verification_status === 'PENDING').length} Pending Review
          </div>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by owner or turf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading approvals queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No verification requests found.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Turf Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Registration Date</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-200">
              {filteredApprovals.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">
                      {v.owner_profiles?.full_name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.owner_profiles?.business_phone || 'No phone'}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">{v.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        v.verification_status === 'APPROVED'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : v.verification_status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {v.verification_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedVenue(v)}
                      className="px-3.5 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                    >
                      View Checklist
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details & Verification Checklist Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Verification Review</h3>
                <p className="text-xs text-gray-400 mt-1">Reviewing: {selectedVenue.name}</p>
              </div>
              <button
                onClick={() => setSelectedVenue(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Info Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Owner and Turf Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                  Business Details
                </h4>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Owner Name:</strong>{' '}
                    {selectedVenue.owner_profiles?.full_name}
                  </p>
                  <p>
                    <strong className="text-white">Business:</strong>{' '}
                    {selectedVenue.owner_profiles?.business_name}
                  </p>
                  <p>
                    <strong className="text-white">Phone:</strong>{' '}
                    {selectedVenue.owner_profiles?.business_phone || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-white">Address:</strong>{' '}
                    {selectedVenue.address || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-white">Turf Type:</strong>{' '}
                    {selectedVenue.turf_type || 'N/A'}
                  </p>
                </div>

                <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                  Bank Details & UPI
                </h4>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Account Name:</strong>{' '}
                    {(Array.isArray(selectedVenue.owner_profiles?.owner_settings)
                      ? selectedVenue.owner_profiles?.owner_settings[0]?.bank_account_name
                      : selectedVenue.owner_profiles?.owner_settings?.bank_account_name) || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-white">Account Number:</strong>{' '}
                    {(Array.isArray(selectedVenue.owner_profiles?.owner_settings)
                      ? selectedVenue.owner_profiles?.owner_settings[0]?.bank_account_number
                      : selectedVenue.owner_profiles?.owner_settings?.bank_account_number) || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-white">IFSC:</strong>{' '}
                    {(Array.isArray(selectedVenue.owner_profiles?.owner_settings)
                      ? selectedVenue.owner_profiles?.owner_settings[0]?.bank_ifsc
                      : selectedVenue.owner_profiles?.owner_settings?.bank_ifsc) || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-white">UPI ID:</strong>{' '}
                    {(Array.isArray(selectedVenue.owner_profiles?.owner_settings)
                      ? selectedVenue.owner_profiles?.owner_settings[0]?.bank_upi
                      : selectedVenue.owner_profiles?.owner_settings?.bank_upi) || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Checklist verification */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                  Verification Checklist
                </h4>
                <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  {/* Item List */}
                  {[
                    { label: 'Email Verified', status: getChecklist(selectedVenue).emailVerified },
                    { label: 'Phone Verified', status: getChecklist(selectedVenue).phoneVerified },
                    {
                      label: 'Identity Proof Uploaded (Aadhaar/PAN)',
                      status: getChecklist(selectedVenue).idUploaded,
                    },
                    { label: 'Bank Details Added', status: getChecklist(selectedVenue).bankAdded },
                    {
                      label: 'Turf Images Uploaded',
                      status: getChecklist(selectedVenue).imagesUploaded,
                    },
                    {
                      label: 'Complete Address Added',
                      status: getChecklist(selectedVenue).addressAdded,
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm text-gray-300"
                    >
                      <span>{item.label}</span>
                      {item.status ? (
                        <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                          <CheckCircle className="w-4 h-4" /> Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                          <XCircle className="w-4 h-4" /> Missing
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setConfirmModal({ venue: selectedVenue, action: 'REJECTED' })}
                className="px-5 py-2 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all"
              >
                Reject Turf
              </button>
              <button
                onClick={() => setConfirmModal({ venue: selectedVenue, action: 'APPROVED' })}
                className="px-6 py-2 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all"
              >
                Approve & Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Status Review
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to set the verification status of{' '}
              <strong className="text-white">{confirmModal.venue.name}</strong> to{' '}
              <strong className="text-green-400">{confirmModal.action}</strong>?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Notes / Reason (Optional):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Identity checklist verification successful..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                rows={3}
              />
            </div>

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
                onClick={handleUpdateStatus}
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
