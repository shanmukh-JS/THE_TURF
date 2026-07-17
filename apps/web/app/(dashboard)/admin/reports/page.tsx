'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Flag,
  ShieldAlert,
  CheckCircle2,
  UserX,
  AlertTriangle,
  Loader2,
  Search,
  Download,
  AlertCircle,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  const [confirmModal, setConfirmModal] = useState<{
    report: any
    action: 'suspend_turf' | 'suspend_owner' | 'resolve'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { report, action } = confirmModal
    let detailsText = ''
    try {
      if (action === 'resolve') {
        const { error } = await supabase
          .from('reports')
          .update({ status: 'RESOLVED' })
          .eq('id', report.id)
        if (error) throw error
        detailsText = 'Report marked as resolved'
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: 'RESOLVED' } : r))
        )
      } else if (action === 'suspend_turf') {
        const { error } = await supabase
          .from('venues')
          .update({ is_disabled: true, verification_status: 'REJECTED' })
          .eq('id', report.venue_id)
        if (error) throw error

        // Also resolve the report automatically
        await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', report.id)

        detailsText = `Turf suspended following report review: ${action}`
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: 'RESOLVED' } : r))
        )
      } else if (action === 'suspend_owner') {
        const { error } = await supabase
          .from('users')
          .update({ is_suspended: true })
          .eq('id', report.owner_id)
        if (error) throw error

        await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', report.id)

        detailsText = `Owner suspended following report review: ${action}`
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: 'RESOLVED' } : r))
        )
      }

      await logAdminAction(`Report Action: ${action}`, 'reports', report.id, detailsText)
    } catch (err) {
      console.error('Failed to perform action:', err)
      alert('Failed to perform action. See console for details.')
    } finally {
      setActionLoading(false)
      setConfirmModal(null)
    }
  }

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select(
          `
          *,
          venues (
            name
          ),
          reporter:users!reporter_id (
            email
          ),
          owner:owner_profiles!owner_id (
            full_name
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reports:', error)
      } else if (data) {
        const formatted = data.map((r: any) => ({
          id: r.id,
          venue_id: r.venue_id,
          owner_id: r.owner_id,
          category: r.category,
          priority: r.priority,
          status: r.status,
          complaint: r.complaint,
          turfName: r.venues?.name || 'Unknown Turf',
          reporterEmail: r.reporter?.email || 'Unknown User',
          ownerName: r.owner?.full_name || 'Unknown Owner',
          createdAt: new Date(r.created_at).toLocaleString(),
          assignedAdmin: r.assigned_admin || 'Unassigned',
        }))
        setReports(formatted)
      }
      setLoading(false)
    }
    fetchReports()
  }, [])

  // Filter
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        r.turfName.toLowerCase().includes(query) ||
        r.reporterEmail.toLowerCase().includes(query) ||
        r.complaint.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [reports, searchQuery, statusFilter, priorityFilter])

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = filteredReports
      .map(
        (r) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-family: monospace;">${r.id}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${r.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${
            r.priority === 'HIGH' ? '#fee2e2; color: #ef4444;' : '#dbeafe; color: #3b82f6;'
          }">
            ${r.priority}
          </span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${r.turfName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${r.reporterEmail}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-style: italic;">"${r.complaint}"</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${
            r.status === 'RESOLVED' ? '#dcfce7; color: #15803d;' : '#fef3c7; color: #d97706;'
          }">
            ${r.status}
          </span>
        </td>
      </tr>
    `
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>System Disputes & Complaints Report</title>
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
            <div class="title">System Disputes Report</div>
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
            Generated on: ${new Date().toLocaleString()} | Filter: Status = ${statusFilter}, Priority = ${priorityFilter}
          </p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Turf Name</th>
                <th>Reporter</th>
                <th>Complaint Description</th>
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
          <h1 className="text-2xl font-bold text-white">Complaints & Ticket Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review customer disputes, complaints, and platform tickets.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </DashboardAnimationItem>

      {/* Controls */}
      <DashboardAnimationItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Statuses
            </option>
            <option value="PENDING" className="text-black">
              Pending
            </option>
            <option value="RESOLVED" className="text-black">
              Resolved
            </option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Priorities
            </option>
            <option value="HIGH" className="text-black">
              High
            </option>
            <option value="MEDIUM" className="text-black">
              Medium
            </option>
            <option value="LOW" className="text-black">
              Low
            </option>
          </select>
        </div>

        <div className="relative max-w-sm w-full font-sans">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tickets by customer or turf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </DashboardAnimationItem>

      {/* Ticket List */}
      <DashboardAnimationItem className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-gray-500 animate-pulse">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-12 text-center text-gray-500 text-sm">
            No active reports match the criteria.
          </div>
        ) : (
          filteredReports.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/8 bg-[#0a0f0a] p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6 hover:border-white/15 transition-all"
            >
              <div className="space-y-3.5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'RESOLVED'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {r.status}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.priority === 'HIGH'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {r.priority} Priority
                  </span>
                  <span className="text-xs text-gray-500">{r.createdAt}</span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Issue Category: {r.category}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Turf Name: <span className="text-white font-medium">{r.turfName}</span> · Owner:{' '}
                    {r.ownerName} · Reporter: {r.reporterEmail}
                  </p>
                </div>

                <p className="text-xs text-gray-300 bg-white/[0.01] border border-white/5 p-4 rounded-xl leading-relaxed">
                  &quot;{r.complaint}&quot;
                </p>

                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  Assigned Officer:{' '}
                  <span className="text-gray-300 font-medium">{r.assignedAdmin}</span>
                </p>
              </div>

              {r.status !== 'RESOLVED' && (
                <div className="flex flex-row lg:flex-col gap-2 self-end lg:self-start">
                  <button
                    onClick={() => setConfirmModal({ report: r, action: 'resolve' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve ticket
                  </button>
                  <button
                    onClick={() => setConfirmModal({ report: r, action: 'suspend_turf' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500 hover:text-black transition-all"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Suspend Turf
                  </button>
                  <button
                    onClick={() => setConfirmModal({ report: r, action: 'suspend_owner' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                  >
                    <UserX className="w-3.5 h-3.5" /> Suspend Owner
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </DashboardAnimationItem>

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
              Set ticket action to{' '}
              <strong className="text-red-400 uppercase">{confirmModal.action}</strong> on this
              dispute?
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
    </DashboardAnimationWrapper>
  )
}
