import { StatCard } from '@/components/ui/StatCard'
import { TrendingUp, CalendarCheck, Star, Users } from 'lucide-react'

// Mock monthly revenue data
const monthlyData = [
  { month: 'Jan', revenue: 18000, bookings: 45 },
  { month: 'Feb', revenue: 22000, bookings: 55 },
  { month: 'Mar', revenue: 19000, bookings: 48 },
  { month: 'Apr', revenue: 31000, bookings: 78 },
  { month: 'May', revenue: 28000, bookings: 70 },
  { month: 'Jun', revenue: 42000, bookings: 105 },
  { month: 'Jul', revenue: 48200, bookings: 127 },
]

const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))

export const metadata = { title: 'Analytics | TRUF GAMING Owner' }

export default function OwnerAnalyticsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Revenue performance and venue occupancy insights.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Revenue This Month" value="₹48,200" change="+14%" trend="up" accent="green" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Total Bookings" value="127" change="+8%" trend="up" accent="blue" icon={<CalendarCheck className="w-5 h-5" />} />
        <StatCard label="Avg. Rating" value="4.8 ★" change="+0.2" trend="up" accent="amber" icon={<Star className="w-5 h-5" />} />
        <StatCard label="Return Customers" value="34%" change="+6%" trend="up" accent="purple" icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Revenue Bar Chart (Pure CSS) */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white">Monthly Revenue (₹)</h2>
          <span className="text-xs text-gray-500">Jan – Jul 2026</span>
        </div>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map((d) => {
            const heightPct = (d.revenue / maxRevenue) * 100
            const isLatest = d.month === 'Jul'
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-mono">₹{Math.round(d.revenue / 1000)}k</span>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-700 ${isLatest ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-white/10 hover:bg-white/20'}`}
                    style={{ height: `${(heightPct / 100) * 160}px` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{d.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Occupancy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Slot Occupancy — This Week</h2>
          {[
            { day: 'Monday', pct: 72 },
            { day: 'Tuesday', pct: 55 },
            { day: 'Wednesday', pct: 88 },
            { day: 'Thursday', pct: 63 },
            { day: 'Friday', pct: 95 },
            { day: 'Saturday', pct: 100 },
            { day: 'Sunday', pct: 90 },
          ].map(({ day, pct }) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">{day}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-gray-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Revenue by Venue</h2>
          {[
            { name: 'Olympia Turf', revenue: 32400, pct: 67 },
            { name: 'Downtown Box', revenue: 15800, pct: 33 },
          ].map((v) => (
            <div key={v.name} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">{v.name}</span>
                <span className="text-green-400 font-semibold">₹{v.revenue.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full" style={{ width: `${v.pct}%` }} />
              </div>
              <p className="text-xs text-gray-500">{v.pct}% of total revenue</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
