import { StatCard } from '@/components/ui/StatCard'
import {
  Building2,
  Users,
  DollarSign,
  CalendarCheck,
  AlertCircle,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'

const pendingVenues = [
  { id: 'V001', name: 'Green Field Turf', owner: 'Suresh Kumar', city: 'Hyderabad', submitted: '3 days ago', status: 'SUBMITTED' },
  { id: 'V002', name: 'Champions Box', owner: 'Vijay Rao', city: 'Bangalore', submitted: '1 day ago', status: 'NEED_CHANGES' },
  { id: 'V003', name: 'Stadium Hub', owner: 'Pradeep Nair', city: 'Chennai', submitted: '5 hours ago', status: 'SUBMITTED' },
]

const recentActivity = [
  { type: 'booking', text: 'New booking by Arjun Mehta at Olympia Turf', time: '2m ago', icon: CalendarCheck, color: 'text-green-400' },
  { type: 'venue', text: 'Venue "Stadium Hub" submitted for review', time: '5h ago', icon: Building2, color: 'text-blue-400' },
  { type: 'payment', text: 'Settlement of ₹12,400 processed to Rajesh Kumar', time: '1d ago', icon: DollarSign, color: 'text-amber-400' },
  { type: 'alert', text: 'Dispute raised for Booking #BK045', time: '2d ago', icon: ShieldAlert, color: 'text-red-400' },
]

export default function AdminDashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-gray-400 mt-1">Real-time health of TRUF GAMING marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">3 Venues Pending Review</span>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Platform Live</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Revenue (GMV)" value="₹2,48,500" change="+22%" trend="up" accent="green" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Total Bookings" value="843" change="+11%" trend="up" accent="blue" icon={<CalendarCheck className="w-5 h-5" />} />
        <StatCard label="Active Venues" value="24" change="+3" trend="up" accent="amber" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Registered Users" value="1,204" change="+58" trend="up" accent="purple" icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Venues Pending Approval */}
        <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Venues Awaiting Approval</h2>
            </div>
            <button className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors">View all →</button>
          </div>
          <div className="divide-y divide-white/5">
            {pendingVenues.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{v.name}</p>
                    <p className="text-xs text-gray-500">{v.owner} · {v.city} · {v.submitted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${v.status === 'NEED_CHANGES' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {v.status.replace('_', ' ')}
                  </span>
                  <button className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors border border-green-500/20">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-1">
          <h2 className="text-sm font-semibold text-white mb-4">Live Activity Feed</h2>
          <div className="space-y-4">
            {recentActivity.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 leading-snug">{a.text}</p>
                    <p className="text-xs text-gray-600 mt-1">{a.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Platform Commission Summary */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Commission Breakdown — This Month</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Gross Booking Value', value: '₹2,48,500', sub: '843 bookings', color: 'text-white' },
            { label: 'Platform Commission (10%)', value: '₹24,850', sub: 'TRUF GAMING Revenue', color: 'text-green-400' },
            { label: 'Owner Payouts', value: '₹2,23,650', sub: 'Disbursed to 18 owners', color: 'text-blue-400' },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-600">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
