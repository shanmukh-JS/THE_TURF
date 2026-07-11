import { FinanceStatCard } from '@/components/finance/FinanceStatCard'
import { EarningsChart } from '@/components/finance/owner/EarningsChart'
import { SettlementTimeline } from '@/components/finance/owner/SettlementTimeline'
import { Wallet, CalendarClock, Download, CalendarCheck, TrendingUp } from 'lucide-react'

export default async function OwnerFinanceOverviewPage() {
  // Enforced scope
  // const ownerId = await requireOwnerContext();

  const stats = {
    lifetimeEarnings: '₹12,45,000',
    availableBalance: '₹42,000',
    pendingSettlement: '₹18,500',
    upcomingPayout: '₹42,000',
    completedBookings: 1420,
    currentMonthRevenue: '₹1,25,000',
  }

  const chartData = [
    { label: 'Mon', revenue: 12000, commission: 1200 },
    { label: 'Tue', revenue: 15000, commission: 1500 },
    { label: 'Wed', revenue: 10000, commission: 1000 },
    { label: 'Thu', revenue: 22000, commission: 2200 },
    { label: 'Fri', revenue: 45000, commission: 4500 },
    { label: 'Sat', revenue: 65000, commission: 6500 },
    { label: 'Sun', revenue: 58000, commission: 5800 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Financial Overview</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceStatCard
          title="Total Lifetime Earnings"
          value={stats.lifetimeEarnings}
          icon={<Wallet className="w-5 h-5" />}
        />
        <FinanceStatCard
          title="Available to Payout"
          value={stats.availableBalance}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Next payout: Tomorrow"
        />
        <FinanceStatCard
          title="Pending Settlement"
          value={stats.pendingSettlement}
          icon={<CalendarClock className="w-5 h-5" />}
          description="Clearing from bank"
        />
        <FinanceStatCard
          title="Completed Bookings"
          value={stats.completedBookings}
          icon={<CalendarCheck className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-2">Revenue This Week</h2>
          <p className="text-sm text-gray-400">Total: {stats.currentMonthRevenue}</p>
          <EarningsChart data={chartData} />
        </div>

        {/* Next Payout Timeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-6">Upcoming Payout Timeline</h2>
          <SettlementTimeline
            steps={[
              {
                label: 'Bookings Completed',
                description: '14 bookings finalized',
                status: 'COMPLETED',
                date: new Date(Date.now() - 86400000 * 2),
              },
              {
                label: 'Settled by Gateway',
                description: 'Funds cleared to platform',
                status: 'COMPLETED',
                date: new Date(Date.now() - 86400000),
              },
              {
                label: 'Payout Batch Generated',
                description: 'Batch #B-8832 ready',
                status: 'ACTIVE',
                date: new Date(),
              },
              {
                label: 'Bank Transfer',
                description: 'Expected processing',
                status: 'PENDING',
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
