import { DollarSign, CheckCircle, Clock, ArrowUpRight } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'

const settlements = [
  { id: 's1', owner: 'Rajesh Kumar', venue: 'Olympia Turf', bookings: 14, amount: 12400, status: 'PENDING', date: 'Jul 5, 2026' },
  { id: 's2', owner: 'Vijay Rao', venue: 'Champions Arena', bookings: 9, amount: 8900, status: 'COMPLETED', transferId: 'TXN_2026070001', date: 'Jul 3, 2026' },
  { id: 's3', owner: 'Pradeep Nair', venue: 'Stadium Hub', bookings: 7, amount: 6300, status: 'PENDING', date: 'Jul 4, 2026' },
  { id: 's4', owner: 'Sunita Rao', venue: 'Green Box', bookings: 11, amount: 9900, status: 'COMPLETED', transferId: 'TXN_2026070002', date: 'Jul 2, 2026' },
]

export default function AdminSettlementsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settlements</h1>
        <p className="text-gray-400 mt-1">Manage owner payouts and platform commission.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Pending Settlements" value="₹18,700" trend="neutral" accent="amber" icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Completed This Month" value="₹18,800" trend="up" accent="green" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard label="Platform Revenue (10%)" value="₹4,190" trend="up" accent="blue" icon={<DollarSign className="w-5 h-5" />} />
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Settlement Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Owner', 'Venue', 'Bookings', 'Amount', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {settlements.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-300">
                        {s.owner.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-white">{s.owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{s.venue}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{s.bookings}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">₹{s.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{s.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      s.status === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.status === 'PENDING' ? (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Approve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 font-mono">{s.transferId}</span>
                    )}
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
