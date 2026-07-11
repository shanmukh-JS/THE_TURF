import { FinanceStatCard } from '@/components/finance/FinanceStatCard'
import { Landmark, ArrowRightLeft, Activity, Users } from 'lucide-react'

export const revalidate = 60 // Refresh every 60 seconds

export default async function FinanceOverviewPage() {
  // Mock Data - In reality, fetch from Supabase views / RPCs
  const stats = {
    totalRevenue: '₹2,45,000.00',
    pendingPayouts: '₹84,000.00',
    successfulPayouts: '124',
    queueBacklog: 3,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Finance Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceStatCard
          title="Total Platform Revenue"
          value={stats.totalRevenue}
          icon={<Landmark className="w-5 h-5" />}
          trend={{ value: '12.5%', isPositive: true }}
          description="vs last month"
        />
        <FinanceStatCard
          title="Pending Payouts"
          value={stats.pendingPayouts}
          icon={<ArrowRightLeft className="w-5 h-5" />}
          description="In transit"
        />
        <FinanceStatCard
          title="Successful Payouts"
          value={stats.successfulPayouts}
          icon={<Users className="w-5 h-5" />}
          trend={{ value: '4.2%', isPositive: true }}
        />
        <FinanceStatCard
          title="Queue Backlog"
          value={stats.queueBacklog}
          icon={<Activity className="w-5 h-5" />}
          description="Jobs waiting"
        />
      </div>

      {/* Adding a placeholder for recent activity or charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-96 flex items-center justify-center">
          <p className="text-gray-500">Revenue Chart (Coming Soon)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-96 flex items-center justify-center">
          <p className="text-gray-500">Queue Health Chart (Coming Soon)</p>
        </div>
      </div>
    </div>
  )
}
