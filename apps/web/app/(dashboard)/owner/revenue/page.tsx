'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import {
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
} from 'lucide-react'

export default function OwnerRevenuePage() {
  const supabase = createClient()
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [pendingRevenue, setPendingRevenue] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRevenue() {
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

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(
          `
          id, 
          total_amount, 
          status, 
          customer_id,
          venue_id,
          created_at,
          slots(date)
        `
        )
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching revenue data:', error)
        setLoading(false)
        return
      }

      if (bookings && bookings.length > 0) {
        const customerIds = Array.from(new Set(bookings.map((b) => b.customer_id)))

        let customerMap = new Map<string, string>()
        if (isAdmin) {
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', customerIds as string[])
          if (users) {
            users.forEach((u) => customerMap.set(u.id, u.email.split('@')[0]))
          }
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

        let totalRev = 0
        let pendingRev = 0

        bookings.forEach((b: any) => {
          if (b.status === 'CONFIRMED') {
            totalRev += Number(b.total_amount)
          } else if (b.status === 'PENDING') {
            pendingRev += Number(b.total_amount)
          }
        })

        setTotalRevenue(totalRev)
        setPendingRevenue(pendingRev)

        const formattedTx = bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .map((b: any) => {
            const dateStr = new Date(b.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const timeStr = new Date(b.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })

            return {
              id: b.id,
              customerName: customerMap.get(b.customer_id) || 'Unknown Customer',
              venueName: venueMap.get(b.venue_id) || 'Unknown Venue',
              date: dateStr,
              time: timeStr,
              amount: b.total_amount,
              status: b.status,
              type: b.status === 'CONFIRMED' ? 'received' : 'pending',
            }
          })

        setTransactions(formattedTx)
      }

      setLoading(false)
    }

    fetchRevenue()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading revenue data...
        </p>
      </div>
    )
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8 h-full">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white mb-2">Revenue Dashboard</h1>
        <p className="text-gray-400">Track your earnings, payouts, and financial insights.</p>
      </DashboardAnimationItem>

      {/* Financial Summary Cards */}
      <DashboardAnimationItem className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-green-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-gray-400 font-medium">Total Earned</h3>
            </div>
            <p className="text-4xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" /> Real-time tracking
            </p>
          </div>
        </div>

        <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-24 h-24 text-amber-500 transform -rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-gray-400 font-medium">Pending Settlements</h3>
            </div>
            <p className="text-4xl font-bold text-white">
              ₹{pendingRevenue.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-amber-400 mt-2 flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" /> Awaiting confirmation
            </p>
          </div>
        </div>
      </DashboardAnimationItem>

      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <Wallet className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400 font-medium">No transactions yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Completed payments will automatically appear here.
              </p>
            </div>
          ) : (
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Transaction ID
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Details
                  </th>
                  <th className="text-right px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-400 font-mono">#{t.id.split('-')[0]}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white">{t.date}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{t.customerName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.venueName}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={`text-sm font-bold ${t.type === 'received' ? 'text-green-400' : 'text-amber-400'}`}
                      >
                        +₹{t.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.status}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
