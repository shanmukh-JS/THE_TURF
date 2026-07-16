'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  Loader2,
  Download,
  Eye,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Plus,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'OWNER'>('CUSTOMER')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')

  // Sorting
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Drawer & Modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [userBookings, setUserBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    user: any
    action: 'suspend' | 'activate' | 'delete'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  const fetchUsers = async () => {
    setLoading(true)

    // Fetch all owners
    const { data: owners } = await supabase.from('owner_profiles').select(`
        *,
        users(email, created_at, is_suspended, phone)
      `)

    // Fetch all players
    const { data: customers } = await supabase.from('customer_profiles').select(`
        *,
        users(email, created_at, is_suspended, phone)
      `)

    const formattedOwners = (owners || []).map((o: any) => ({
      id: o.user_id,
      email: o.users?.email || 'owner@truf.com',
      phone: o.users?.phone || '—',
      role: 'OWNER',
      created_at: o.users?.created_at || new Date().toISOString(),
      is_suspended: o.users?.is_suspended || false,
      owner_profiles: o,
      customer_profiles: null,
    }))

    const formattedCustomers = (customers || []).map((c: any) => ({
      id: c.user_id,
      email: c.users?.email || 'player@truf.com',
      phone: c.users?.phone || '—',
      role: 'CUSTOMER',
      created_at: c.users?.created_at || new Date().toISOString(),
      is_suspended: c.users?.is_suspended || false,
      owner_profiles: null,
      customer_profiles: c,
    }))

    setUsers([...formattedOwners, ...formattedCustomers])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_profiles' }, () =>
        fetchUsers()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profiles' }, () =>
        fetchUsers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch bookings for the selected user when drawer opens
  useEffect(() => {
    if (!selectedUser) return

    async function fetchUserBookings() {
      setLoadingBookings(true)
      const isOwner = selectedUser.role === 'OWNER'

      let query = supabase.from('bookings').select(`
        id, total_amount, status, created_at,
        venues(name),
        slots(date, start_time)
      `)

      if (isOwner) {
        // Get owner's venues
        const { data: ownerVenues } = await supabase
          .from('venues')
          .select('id')
          .eq('owner_id', selectedUser.id) // check profile linking if needed

        if (ownerVenues && ownerVenues.length > 0) {
          query = query.in(
            'venue_id',
            ownerVenues.map((v) => v.id)
          )
        } else {
          setUserBookings([])
          setLoadingBookings(false)
          return
        }
      } else {
        query = query.eq('customer_id', selectedUser.id)
      }

      const { data } = await query.order('created_at', { ascending: false })
      setUserBookings(data || [])
      setLoadingBookings(false)
    }

    fetchUserBookings()
  }, [selectedUser])

  // Handle suspend / activate / delete
  const handleConfirmAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { user, action } = confirmModal

    if (action === 'delete') {
      const { error } = await supabase.from('users').delete().eq('id', user.id)
      if (!error) {
        await logAdminAction('User Deleted', 'users', user.id, `User account deleted`)
        setUsers((prev) => prev.filter((u) => u.id !== user.id))
        if (selectedUser?.id === user.id) setSelectedUser(null)
      }
    } else {
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
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_suspended: shouldSuspend } : u))
        )
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev: any) => (prev ? { ...prev, is_suspended: shouldSuspend } : null))
        }
      }
    }

    setActionLoading(false)
    setConfirmModal(null)
  }

  // Get cities for filtering
  const cities = useMemo(() => {
    const list = new Set<string>()
    return Array.from(list)
  }, [users])

  // Filter, sort & paginate users
  const processedUsers = useMemo(() => {
    let result = users.filter((u) => u.role === activeTab)

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((u) => {
        const profile = activeTab === 'OWNER' ? u.owner_profiles?.[0] : u.customer_profiles?.[0]
        const name = profile?.full_name || ''
        return u.email.toLowerCase().includes(query) || name.toLowerCase().includes(query)
      })
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const wantsSuspended = statusFilter === 'SUSPENDED'
      result = result.filter((u) => !!u.is_suspended === wantsSuspended)
    }

    // City filter
    if (cityFilter !== 'ALL') {
      result = result.filter((u) => '—' === cityFilter)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'name') {
        const aProfile = activeTab === 'OWNER' ? a.owner_profiles : a.customer_profiles
        const bProfile = activeTab === 'OWNER' ? b.owner_profiles : b.customer_profiles
        aVal = (aProfile as any)?.full_name || ''
        bVal = (bProfile as any)?.full_name || ''
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [users, activeTab, searchQuery, statusFilter, cityFilter, sortField, sortOrder])

  // Paginated chunk
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return processedUsers.slice(start, start + itemsPerPage)
  }, [processedUsers, currentPage])

  const totalPages = Math.ceil(processedUsers.length / itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = processedUsers
      .map((u) => {
        const profile = activeTab === 'OWNER' ? u.owner_profiles : u.customer_profiles
        const name = (profile as any)?.full_name || 'No Name Added'
        const city = activeTab === 'OWNER' ? (profile as any)?.business_name || '—' : '—'
        const status = u.is_suspended ? 'SUSPENDED' : 'ACTIVE'
        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${u.email}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${u.role}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${city}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(u.created_at).toLocaleDateString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            <span style="padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${
              status === 'ACTIVE' ? '#dcfce7; color: #15803d;' : '#fee2e2; color: #ef4444;'
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
          <title>Users Directory Report (${activeTab})</title>
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
            <div class="title">Users Directory Report - ${activeTab}s</div>
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
            Generated on: ${new Date().toLocaleString()} | Total Accounts: ${processedUsers.length}
          </p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>${activeTab === 'OWNER' ? 'Business Name' : 'City'}</th>
                <th>Registered Date</th>
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
          <h1 className="text-2xl font-bold text-white">Users Directory</h1>
          <p className="text-gray-400 text-sm mt-1">Manage and audit player and owner accounts.</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </DashboardAnimationItem>

      {/* Controls: Tabs & Filters */}
      <DashboardAnimationItem className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => {
              setActiveTab('CUSTOMER')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'CUSTOMER'
                ? 'bg-green-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => {
              setActiveTab('OWNER')
              setCurrentPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'OWNER'
                ? 'bg-green-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Turf Owners
          </button>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative flex-1 xl:flex-none xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Statuses
            </option>
            <option value="ACTIVE" className="text-black">
              Active
            </option>
            <option value="SUSPENDED" className="text-black">
              Suspended
            </option>
          </select>

          {/* City Filter */}
          {activeTab === 'CUSTOMER' && (
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
            >
              <option value="ALL" className="text-black">
                All Cities
              </option>
              {cities.map((city) => (
                <option key={city} value={city} className="text-black">
                  {city}
                </option>
              ))}
            </select>
          )}
        </div>
      </DashboardAnimationItem>

      {/* Directory Table */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading users list...</p>
          </div>
        ) : processedUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No accounts found matching this criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortField === 'email' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">City</th>
                  <th
                    className="px-6 py-4 cursor-pointer select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    Registered {sortField === 'created_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-200">
                {paginatedUsers.map((u) => {
                  const profile = activeTab === 'OWNER' ? u.owner_profiles : u.customer_profiles
                  const name = (profile as any)?.full_name || 'No Name Added'
                  const city = '—'

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center text-xs font-bold text-green-400">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {name}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{u.email}</td>
                      <td className="px-6 py-4 text-gray-400">{city}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_suspended ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/10">
                            SUSPENDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/10">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {u.is_suspended ? (
                            <button
                              onClick={() =>
                                setConfirmModal({ isOpen: true, user: u, action: 'activate' })
                              }
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Activate User"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setConfirmModal({ isOpen: true, user: u, action: 'suspend' })
                              }
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Suspend User"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setConfirmModal({ isOpen: true, user: u, action: 'delete' })
                            }
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* RIGHT DRAWER - User Full details */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedUser(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-[#0a0f0a] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">User Inspection</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-lg font-bold text-green-400">
                  {(activeTab === 'OWNER'
                    ? selectedUser.owner_profiles?.[0]?.full_name
                    : selectedUser.customer_profiles?.[0]?.full_name
                  )
                    ?.charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {activeTab === 'OWNER'
                      ? selectedUser.owner_profiles?.[0]?.full_name
                      : selectedUser.customer_profiles?.[0]?.full_name || 'No Name Added'}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Status
                  </p>
                  <span
                    className={`text-xs font-semibold ${selectedUser.is_suspended ? 'text-red-400' : 'text-green-400'}`}
                  >
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Mobile
                  </p>
                  <p className="text-xs font-semibold text-white">{selectedUser.phone || '—'}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    City
                  </p>
                  <p className="text-xs font-semibold text-white">—</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    Registered
                  </p>
                  <p className="text-xs font-semibold text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Booking History Inside Drawer */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Activity History
                </h4>
                {loadingBookings ? (
                  <div className="py-6 text-center text-xs text-gray-500">
                    Loading user activity...
                  </div>
                ) : userBookings.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-600 bg-white/5 rounded-xl border border-white/5">
                    No bookings found for this user.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {userBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{b.venues?.name}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">
                            {b.slots?.date} • {new Date(b.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">₹{b.total_amount}</p>
                          <span
                            className={`text-[10px] uppercase font-semibold ${b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
              You are about to{' '}
              <span className="text-white font-semibold uppercase">{confirmModal.action}</span> the
              account belonging to <strong className="text-white">{confirmModal.user.email}</strong>
              .
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
                  confirmModal.action === 'suspend' || confirmModal.action === 'delete'
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
    </DashboardAnimationWrapper>
  )
}
