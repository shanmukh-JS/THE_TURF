'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react'

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  CONFIRMED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function OwnerBookingsPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Check user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const isAdmin = userData?.role === 'ADMIN'

      // For ADMIN: fetch ALL venues. For OWNER: fetch only their venues.
      let venues: any[] = []
      if (isAdmin) {
        const { data: allVenues } = await supabase.from('venues').select('id, name')
        venues = allVenues || []
      } else {
        const { data: profile } = await supabase
          .from('owner_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!profile) {
          setLoading(false)
          return
        }

        const { data: ownerVenues } = await supabase
          .from('venues')
          .select('id, name')
          .eq('owner_id', profile.id)

        venues = ownerVenues || []
      }

      if (venues.length === 0) {
        setLoading(false)
        return
      }

      const venueIds = venues.map((v) => v.id)
      const venueMap = new Map(venues.map((v) => [v.id, v.name]))

      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(
          `
          id, 
          total_amount, 
          status, 
          customer_id,
          venue_id,
          created_at,
          slot_id,
          slots(date, start_time)
        `
        )
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching bookings:', error)
        setLoading(false)
        return
      }

      if (bookingsData && bookingsData.length > 0) {
        const customerIds = Array.from(new Set(bookingsData.map((b) => b.customer_id)))

        // For admin, use a broader query for customer profiles
        let customerMap = new Map<string, string>()
        if (isAdmin) {
          // Admin can read all via users table
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', customerIds as string[])

          if (users) {
            users.forEach((u) => customerMap.set(u.id, u.email.split('@')[0]))
          }

          // Try customer_profiles too
          const { data: cp } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])

          if (cp) {
            cp.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }
        } else {
          const { data: customerProfiles } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])

          if (customerProfiles) {
            customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }
        }

        const formatted = bookingsData.map((b: any) => {
          const slot = b.slots && !Array.isArray(b.slots) ? b.slots : null
          let dateStr = 'N/A'
          let timeStr = 'N/A'

          if (slot) {
            const d = new Date(slot.date)
            dateStr = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            if (slot.start_time) {
              timeStr = new Date(slot.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            }
          }

          return {
            id: b.id,
            customerName: customerMap.get(b.customer_id) || 'Unknown Customer',
            venueName: venueMap.get(b.venue_id) || 'Unknown Venue',
            date: dateStr,
            time: timeStr,
            amount: b.total_amount,
            status: b.status || 'PENDING',
            createdAt: b.created_at,
          }
        })

        setBookings(formatted)
      }

      setLoading(false)
    }

    fetchBookings()
  }, [])

  // Filter bookings based on search query and status filter
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      searchQuery === '' ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading bookings...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white mb-2">Bookings</h1>
        <p className="text-gray-400">Manage all your upcoming and past venue reservations.</p>
      </DashboardAnimationItem>

      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            All Bookings ({filteredBookings.length})
          </h2>

          <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search customer, venue or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
            >
              <option value="ALL" className="text-black">
                All Statuses
              </option>
              <option value="CONFIRMED" className="text-black">
                Confirmed
              </option>
              <option value="PENDING" className="text-black">
                Pending
              </option>
              <option value="CANCELLED" className="text-black">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <CalendarCheck className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400 font-medium">
                {bookings.length === 0 ? 'No bookings found' : 'No bookings match your search'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {bookings.length === 0
                  ? 'Your bookings will appear here once customers reserve your venues.'
                  : 'Try adjusting your search query or filters.'}
              </p>
            </div>
          ) : (
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Customer
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Venue
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b, i) => {
                  const s = statusConfig[b.status] ?? statusConfig['PENDING']!
                  const StatusIcon = s.icon

                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center text-sm font-bold text-green-400 border border-green-500/10">
                            {b.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                              {b.customerName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              #{b.id.split('-')[0]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">{b.venueName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-300">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {b.date}
                          <span className="text-gray-500 mx-1">•</span>
                          <span className="font-medium text-white">{b.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-white">
                          ₹{b.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-current/10 ${s.color} ${s.bg}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
