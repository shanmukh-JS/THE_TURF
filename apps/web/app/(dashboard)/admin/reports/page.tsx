'use client'

import { useState } from 'react'
import { Flag, ShieldAlert, CheckCircle2, UserX, AlertTriangle, Loader2 } from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([
    {
      id: 'rep-1',
      turfName: 'Olympia Turf',
      ownerName: 'Rajesh Kumar',
      reporterEmail: 'arjun@gmail.com',
      complaint: 'Overlapping bookings: The slot from 6pm to 7pm was double-booked.',
      status: 'PENDING',
      createdAt: '2 hours ago',
    },
    {
      id: 'rep-2',
      turfName: 'Gachibowli Arena',
      ownerName: 'Vikas Reddy',
      reporterEmail: 'karan@gmail.com',
      complaint: 'Floodlights did not work during the booked night slot.',
      status: 'RESOLVED',
      createdAt: '1 day ago',
    },
  ])
  const [confirmModal, setConfirmModal] = useState<{
    report: any
    action: 'suspend_turf' | 'suspend_owner' | 'resolve'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { report, action } = confirmModal

    // Simulate updating backend
    let detailsText = ''
    if (action === 'resolve') {
      detailsText = 'Report marked as resolved'
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'RESOLVED' } : r)))
    } else {
      detailsText = `Account/Turf suspended following report review: ${action}`
    }

    await logAdminAction(`Report Action: ${action}`, 'reports', report.id, detailsText)

    setActionLoading(false)
    setConfirmModal(null)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Complaints & Reports</h1>
        <p className="text-gray-400 mt-1">
          Review customer disputes, complaints, and suspension requests.
        </p>
      </div>

      {/* List */}
      <div className="space-y-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 flex flex-col md:flex-row md:items-start justify-between gap-6"
          >
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === 'RESOLVED'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-xs text-gray-500">{r.createdAt}</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Reported: {r.turfName}</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Owner: {r.ownerName} · Reported by: {r.reporterEmail}
                </p>
              </div>

              <p className="text-sm text-gray-300 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                {r.complaint}
              </p>
            </div>

            {r.status !== 'RESOLVED' && (
              <div className="flex flex-row md:flex-col gap-2.5 self-end md:self-start">
                <button
                  onClick={() => setConfirmModal({ report: r, action: 'resolve' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500/15 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Report
                </button>
                <button
                  onClick={() => setConfirmModal({ report: r, action: 'suspend_turf' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500 hover:text-black transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Suspend Turf
                </button>
                <button
                  onClick={() => setConfirmModal({ report: r, action: 'suspend_owner' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                >
                  <UserX className="w-3.5 h-3.5" /> Suspend Owner
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Report Action
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to perform action{' '}
              <strong className="text-red-400">{confirmModal.action}</strong> on this complaint?
              This will update status flags and audit actions immediately.
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
                onClick={handleAction}
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
