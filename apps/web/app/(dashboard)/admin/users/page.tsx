'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserCheck, UserX, ShieldAlert, Loader2 } from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'OWNER'>('CUSTOMER')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    user: any
    action: 'suspend' | 'activate'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        owner_profiles(full_name, business_name, business_phone),
        customer_profiles(full_name, phone)
      `
      )
      .order('created_at', { ascending: false })

    if (data) setUsers(data)
    setLoading(false)
  }

  const handleToggleSuspension = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { user, action } = confirmModal
    const shouldSuspend = action === 'suspend'

    const { error } = await supabase
      .from('users')
      .update({ is_suspended: shouldSuspend })
      .eq('id', user.id)

    if (!error) {
      await logAdminAction(
        shouldSuspend ? 'User Suspended' : 'User Activated',
        'users',
        user.id,
        `Suspended state updated to ${shouldSuspend}`
      )

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: shouldSuspend } : u))
      )
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  const filteredUsers = users.filter((u) => {
    const isRoleMatch = u.role === activeTab
    const profile = activeTab === 'OWNER' ? u.owner_profiles?.[0] : u.customer_profiles?.[0]
    const name = profile?.full_name || 'No Name Added'
    const searchString = searchQuery.toLowerCase()

    const isSearchMatch =
      u.email.toLowerCase().includes(searchString) || name.toLowerCase().includes(searchString)

    return isRoleMatch && isSearchMatch
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Users Directory</h1>
        <p className="text-gray-400 mt-1">Manage and audit player and owner accounts.</p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('CUSTOMER')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'CUSTOMER'
                ? 'bg-green-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab('OWNER')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'OWNER'
                ? 'bg-green-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Turf Owners
          </button>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
            <p className="text-sm">Loading users list...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No accounts found matching this criteria.
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-200">
              {filteredUsers.map((u) => {
                const profile =
                  activeTab === 'OWNER' ? u.owner_profiles?.[0] : u.customer_profiles?.[0]
                const name = profile?.full_name || 'No Name Added'
                return (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{name}</td>
                    <td className="px-6 py-4 text-gray-400">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === 'OWNER'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_suspended ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-500/10 text-green-400">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.is_suspended ? (
                        <button
                          onClick={() =>
                            setConfirmModal({ isOpen: true, user: u, action: 'activate' })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Activate
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setConfirmModal({ isOpen: true, user: u, action: 'suspend' })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all"
                        >
                          <UserX className="w-3.5 h-3.5" /> Suspend
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

      {/* Confirmation Dialog Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Confirm User Action
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Are you sure you want to proceed?</p>
              </div>
            </div>

            <p className="text-sm text-gray-300">
              You are about to {confirmModal.action} the user account{' '}
              <strong className="text-white">{confirmModal.user.email}</strong>. This changes their
              platform status and permission levels.
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
                onClick={handleToggleSuspension}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-2 ${
                  confirmModal.action === 'suspend'
                    ? 'bg-red-600 hover:bg-red-500'
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
