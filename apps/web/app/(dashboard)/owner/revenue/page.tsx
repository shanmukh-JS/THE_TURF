import { createClient } from '@/lib/supabase/server'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'

export default async function OwnerRevenuePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let totalRevenue = 0
  let pendingRevenue = 0
  let formattedTransactions: any[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', profile.id)

      if (venues && venues.length > 0) {
        const venueIds = venues.map((v) => v.id)

        const { data: bookings } = await supabase
          .from('bookings')
          .select(
            `
            id, 
            total_amount, 
            status, 
            customer_id,
            created_at,
            slot:slots(date),
            venue:venues(name)
          `
          )
          .in('venue_id', venueIds)
          .order('created_at', { ascending: false })

        if (bookings && bookings.length > 0) {
          const customerIds = Array.from(new Set(bookings.map((b) => b.customer_id)))

          const { data: customerProfiles } = await supabase
            .from('customer_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds as string[])

          const customerMap = new Map()
          if (customerProfiles) {
            customerProfiles.forEach((p) => customerMap.set(p.user_id, p.full_name))
          }

          bookings.forEach((b) => {
            if (b.status === 'CONFIRMED') {
              totalRevenue += Number(b.total_amount)
            } else if (b.status === 'PENDING') {
              pendingRevenue += Number(b.total_amount)
            }
          })

          formattedTransactions = bookings
            .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
            .map((b) => {
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
                venueName: b.venue && !Array.isArray(b.venue) ? b.venue.name : 'Unknown Venue',
                date: dateStr,
                time: timeStr,
                amount: b.total_amount,
                status: b.status,
                type: b.status === 'CONFIRMED' ? 'received' : 'pending',
              }
            })
        }
      }
    }
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
          {formattedTransactions.length === 0 ? (
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
                {formattedTransactions.map((t, i) => (
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
