import { StatCard } from '@/components/ui/StatCard'
import { TrendingUp, Building2, Users, DollarSign } from 'lucide-react'

const gmvData = [
  { month: 'Jan', gmv: 80000 },
  { month: 'Feb', gmv: 105000 },
  { month: 'Mar', gmv: 92000 },
  { month: 'Apr', gmv: 148000 },
  { month: 'May', gmv: 163000 },
  { month: 'Jun', gmv: 210000 },
  { month: 'Jul', gmv: 248500 },
]

const maxGmv = Math.max(...gmvData.map((d) => d.gmv))

const topVenues = [
  { name: 'Champions Arena', city: 'Hyderabad', bookings: 211, revenue: 316500, growth: '+22%' },
  { name: 'Olympia Turf', city: 'Hyderabad', bookings: 128, revenue: 153600, growth: '+14%' },
  { name: 'Green Field Turf', city: 'Bangalore', bookings: 98, revenue: 147000, growth: '+31%' },
  { name: 'Stadium Hub', city: 'Chennai', bookings: 76, revenue: 114000, growth: '+9%' },
]

export const metadata = { title: 'Platform Analytics | TURF GAMING Admin' }

export default function AdminAnalyticsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
        <p className="text-gray-400 mt-1">Marketplace health, GMV trends, and growth metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total GMV (Jul)"
          value="₹2,48,500"
          change="+22%"
          trend="up"
          accent="green"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Platform Revenue (10%)"
          value="₹24,850"
          change="+22%"
          trend="up"
          accent="blue"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="Active Venues"
          value="24"
          change="+4"
          trend="up"
          accent="amber"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Total Users"
          value="1,204"
          change="+58"
          trend="up"
          accent="purple"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* GMV Chart */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white">Platform GMV (₹) — Jan to Jul 2026</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Revenue
            <span className="ml-3 text-green-400 font-semibold">▲ 211% YTD growth</span>
          </div>
        </div>
        <div className="flex items-end gap-3 h-52">
          {gmvData.map((d) => {
            const h = (d.gmv / maxGmv) * 100
            const isLatest = d.month === 'Jul'
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">
                  ₹{Math.round(d.gmv / 1000)}k
                </span>
                <div
                  className={`w-full rounded-t-xl transition-all duration-700 ${isLatest ? 'bg-gradient-to-t from-green-700 to-green-400 shadow-lg shadow-green-900/40' : 'bg-white/8 hover:bg-white/15'}`}
                  style={{ height: `${(h / 100) * 180}px` }}
                />
                <span className="text-xs text-gray-500">{d.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Venues */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Top Performing Venues</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Venue', 'City', 'Bookings', 'Revenue', 'Growth'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs text-gray-500 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topVenues.map((v, i) => (
                <tr key={v.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 font-mono w-4">#{i + 1}</span>
                      <span className="text-sm font-medium text-white">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{v.city}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{v.bookings}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">
                    ₹{v.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      {v.growth}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
