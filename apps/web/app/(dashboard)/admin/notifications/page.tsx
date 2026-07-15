'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  RefreshCw,
  Search,
  ShieldAlert,
  CheckCircle,
  Mail,
  Database,
  Filter,
  Eye,
} from 'lucide-react'

export default function AdminNotificationsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Status summaries
  const [summary, setSummary] = useState({
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
  })

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // 1. Fetch parent notification audit records
      const { data, error } = await supabase
        .from('notification_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      if (data) {
        setLogs(data)

        // Calculate statistics
        const stats = { queued: 0, sending: 0, sent: 0, failed: 0 }
        data.forEach((item) => {
          if (item.status === 'QUEUED') stats.queued++
          else if (item.status === 'PROCESSING') stats.sending++
          else if (item.status === 'DELIVERED' || item.status === 'READ') stats.sent++
          else if (item.status === 'FAILED') stats.failed++
        })
        setSummary(stats)
      }
    } catch (err: any) {
      console.error('Failed to load notification audits:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const recipient = log.payload?.email || log.payload?.phone || 'N/A'
    return (
      recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.provider && log.provider.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 bg-[#060d06] min-h-screen text-white">
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Notification Logs & Audits</h1>
          <p className="text-gray-400 text-xs mt-1">
            Monitor real-time delivery status, queue diagnostics, and in-app event history.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 bg-white/5 rounded-xl border border-white/8 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </DashboardAnimationItem>

      {/* Summary Row */}
      <DashboardAnimationItem className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
            Queued Jobs
          </span>
          <span className="text-2xl font-extrabold text-blue-400 mt-2">{summary.queued}</span>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
            Processing
          </span>
          <span className="text-2xl font-extrabold text-yellow-400 mt-2">{summary.sending}</span>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
            Delivered
          </span>
          <span className="text-2xl font-extrabold text-green-400 mt-2">{summary.sent}</span>
        </div>
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-bold">
            Failed
          </span>
          <span className="text-2xl font-extrabold text-red-400 mt-2">{summary.failed}</span>
        </div>
      </DashboardAnimationItem>

      {/* Main Audit Log Table */}
      <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-6">
        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient, event type, or provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/40"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">No matching logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-500">
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">
                    Date/Time
                  </th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">
                    Recipient
                  </th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">
                    Channel
                  </th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Event</th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">
                    Status
                  </th>
                  <th className="pb-3 font-semibold uppercase tracking-wider text-[10px] text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="py-4 text-gray-400 font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 font-mono font-medium text-white">
                      {log.payload?.email || log.payload?.phone || 'N/A'}
                    </td>
                    <td className="py-4 text-gray-300 font-medium">{log.channel}</td>
                    <td className="py-4 text-gray-400">{log.event}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          log.status === 'DELIVERED' || log.status === 'READ'
                            ? 'bg-green-500/10 text-green-400'
                            : log.status === 'FAILED'
                              ? 'bg-red-500/10 text-red-400 font-bold'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardAnimationItem>

      {/* Log Inspector Overlay Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-6 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-base">Payload Inspector</h3>
                <span className="text-[10px] text-gray-500 font-mono">
                  Log ID: {selectedLog.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[9px] block">
                    Message ID
                  </span>
                  <span className="text-white font-medium">
                    {selectedLog.provider_message_id || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[9px] block">
                    Error Message
                  </span>
                  <span className="text-red-400 font-mono text-[10px]">
                    {selectedLog.error_text || 'None'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-gray-500 uppercase tracking-wider text-[9px] block">
                  Raw JSON Data
                </span>
                <pre className="p-4 bg-black border border-white/5 rounded-xl text-[10px] text-green-400 font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
