import { createClient } from '@/lib/supabase/server'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { CalendarCheck, Clock, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react'

const statusConfig = {
  CONFIRMED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default async function OwnerBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let formattedBookings: any[] = []

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
            slot:slots(date, start_time),
            venue:venues(name)
          `
          )
          .in('venue_id', venueIds)
          .order('id', { ascending: false })

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

          formattedBookings = bookings.map((b: any) => {
            const slot = b.slot && !Array.isArray(b.slot) ? b.slot : null
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
              venueName: b.venue && !Array.isArray(b.venue) ? b.venue.name : 'Unknown Venue',
              date: dateStr,
              time: timeStr,
              amount: b.total_amount,
              status: b.status || 'PENDING',
            }
          })
        }
      }
    }
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
            All Bookings ({formattedBookings.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by customer or venue..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {formattedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <CalendarCheck className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-400 font-medium">No bookings found</p>
              <p className="text-gray-500 text-sm mt-1">
                Your bookings will appear here once customers reserve your venues.
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
                {formattedBookings.map((b, i) => {
                  const s =
                    statusConfig[b.status as keyof typeof statusConfig] || statusConfig.PENDING
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
