import { StatCard } from '@/components/ui/StatCard'
import { ClientGreeting } from '@/components/dashboard/ClientGreeting'
import {
  TrendingUp,
  CalendarCheck,
  Star,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

const recentBookings = [
  {
    id: 'BK001',
    customer: 'Arjun Mehta',
    venue: 'Olympia Turf',
    date: 'Jul 5',
    time: '7:00 PM',
    amount: '₹1,200',
    status: 'CONFIRMED',
  },
  {
    id: 'BK002',
    customer: 'Priya Sharma',
    venue: 'Olympia Turf',
    date: 'Jul 6',
    time: '9:00 AM',
    amount: '₹900',
    status: 'PENDING',
  },
  {
    id: 'BK003',
    customer: 'Ravi Teja',
    venue: 'Downtown Box',
    date: 'Jul 6',
    time: '5:00 PM',
    amount: '₹1,500',
    status: 'CONFIRMED',
  },
  {
    id: 'BK004',
    customer: 'Sneha Reddy',
    venue: 'Olympia Turf',
    date: 'Jul 7',
    time: '8:00 PM',
    amount: '₹1,200',
    status: 'CANCELLED',
  },
  {
    id: 'BK005',
    customer: 'Kiran Babu',
    venue: 'Downtown Box',
    date: 'Jul 8',
    time: '6:00 PM',
    amount: '₹1,500',
    status: 'CONFIRMED',
  },
]

const statusConfig = {
  CONFIRMED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default async function OwnerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let activeVenuesCount = 0
  if (user) {
    const { count } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    activeVenuesCount = count || 0
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <ClientGreeting />
          <p className="text-gray-400 mt-1">Here&apos;s how your venues are performing today.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">
            {activeVenuesCount} {activeVenuesCount === 1 ? 'Venue' : 'Venues'} Active
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Revenue This Month"
          value="₹48,200"
          change="+14%"
          trend="up"
          accent="green"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Total Bookings"
          value="127"
          change="+8%"
          trend="up"
          accent="blue"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Avg. Rating"
          value="4.8 ★"
          change="+0.2"
          trend="up"
          accent="amber"
          icon={<Star className="w-5 h-5" />}
        />
        <StatCard
          label="Unique Customers"
          value="89"
          change="+5%"
          trend="up"
          accent="purple"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Recent Bookings & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Bookings Table */}
        <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
            <button className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium">
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Amount</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentBookings.map((b) => {
                  const s = statusConfig[b.status as keyof typeof statusConfig]
                  const StatusIcon = s.icon
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-600/30 flex items-center justify-center text-xs font-bold text-green-300 flex-shrink-0">
                            {b.customer.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{b.customer}</p>
                            <p className="text-xs text-gray-500">{b.venue}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-300">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {b.date} · {b.time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{b.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color} ${s.bg}`}
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
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
            <div className="space-y-2">
              {[
                {
                  label: 'Add New Venue',
                  sub: 'List your cricket box',
                  color: 'bg-green-500/10 border-green-500/20 text-green-400',
                  href: '/owner/venues/new',
                },
                {
                  label: 'Manage Slots',
                  sub: 'Edit availability calendar',
                  color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                  href: '/owner/bookings',
                },
                {
                  label: 'View Revenue',
                  sub: 'Payouts & settlements',
                  color: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                  href: '/owner/revenue',
                },
              ].map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer ${a.color}`}
                >
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{a.sub}</p>
                  </div>
                  <span className="text-lg">→</span>
                </a>
              ))}
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-3">
            <h2 className="text-sm font-semibold text-white">Today&apos;s Slots</h2>
            {[
              { time: '07:00 PM', customer: 'Arjun M.', status: 'booked' },
              { time: '08:00 PM', customer: '—', status: 'free' },
              { time: '09:00 PM', customer: 'Ravi T.', status: 'booked' },
            ].map((s) => (
              <div key={s.time} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 w-14">{s.time}</span>
                <div
                  className={`flex-1 h-8 rounded-lg flex items-center px-3 text-xs font-medium ${s.status === 'booked' ? 'bg-green-500/15 text-green-300 border border-green-500/20' : 'bg-white/5 text-gray-500 border border-white/5'}`}
                >
                  {s.customer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
