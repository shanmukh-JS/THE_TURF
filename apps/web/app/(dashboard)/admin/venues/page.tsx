'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Search, Power, Trash2, Eye, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminTurfManagementPage() {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    venue: any
    action: 'enable' | 'disable' | 'delete'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchVenues()
  }, [])

  async function fetchVenues() {
    setLoading(true)
    const { data, error } = await supabase
      .from('venues')
      .select(
        `
        *,
        owner_profiles(full_name, business_name),
        cities(name)
      `
      )
      .order('created_at', { ascending: false })

    if (data) setVenues(data)
    setLoading(false)
  }

  const handleConfirmAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { venue, action } = confirmModal

    if (action === 'delete') {
      const { error } = await supabase.from('venues').delete().eq('id', venue.id)

      if (!error) {
        await logAdminAction(
          'Turf Removed',
          'venues',
          venue.id,
          `Venue ${venue.name} deleted by admin`
        )
        setVenues((prev) => prev.filter((v) => v.id !== venue.id))
      }
    } else {
      const shouldDisable = action === 'disable'
      const { error } = await supabase
        .from('venues')
        .update({ is_disabled: shouldDisable })
        .eq('id', venue.id)

      if (!error) {
        await logAdminAction(
          shouldDisable ? 'Turf Disabled' : 'Turf Enabled',
          'venues',
          venue.id,
          `Venue disabled state updated to ${shouldDisable}`
        )
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? { ...v, is_disabled: shouldDisable } : v))
        )
      }
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  const filteredVenues = venues.filter((v) => {
    const name = v.name || ''
    const ownerName = v.owner_profiles?.full_name || ''
    const matchSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Turf Management</h1>
        <p className="text-gray-400 mt-1">
          Enable, disable, search, and audit all listings on TRUF GAMING.
        </p>
      </div>

      {/* Stats and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-green-500/10 px-3.5 py-1.5 rounded-xl border border-green-500/20 text-green-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          {venues.filter((v) => v.verification_status === 'APPROVED' && !v.is_disabled).length}{' '}
          Active Turfs
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by turf name or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading turfs...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No turfs found matching this criteria.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Turf Details</th>
                <th className="px-6 py-4">Owner Name</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-200">
              {filteredVenues.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">
                    <p>{v.name}</p>
                    <p className="text-xs text-gray-400 font-normal mt-0.5">
                      {v.turf_type || 'Custom Type'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {v.owner_profiles?.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{v.cities?.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        v.verification_status === 'APPROVED'
                          ? 'bg-green-500/10 text-green-400'
                          : v.verification_status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {v.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {v.is_disabled ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400">
                        DISABLED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/10 text-green-400">
                        ENABLED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/admin/venues/${v.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/15 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-400" /> View
                    </Link>
                    {v.is_disabled ? (
                      <button
                        onClick={() => setConfirmModal({ venue: v, action: 'enable' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                      >
                        <Power className="w-3.5 h-3.5" /> Enable
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmModal({ venue: v, action: 'disable' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Power className="w-3.5 h-3.5" /> Disable
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmModal({ venue: v, action: 'delete' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Turf Action
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to <strong className="text-white">{confirmModal.action}</strong>{' '}
              the turf <strong className="text-white">{confirmModal.venue.name}</strong>? This
              change affects customer visibility on the main explore list.
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
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-500'
                    : confirmModal.action === 'disable'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-green-600 hover:bg-green-500'
                }`}
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
