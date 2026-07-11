'use client'

import { useEffect, useState } from 'react'
import { FinanceStatCard } from '../../../../components/finance/FinanceStatCard'
import { Server, Activity, Database, AlertCircle } from 'lucide-react'

export default function WorkersPage() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health/workers')
      const data = await res.json()
      setHealth(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000) // Poll every 5s per spec
    return () => clearInterval(interval)
  }, [])

  if (loading && !health) {
    return <div className="text-gray-400">Loading worker status...</div>
  }

  const isHealthy = health?.status === 'healthy'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Worker & Queue Health</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time status of the BullMQ processing pipeline.
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium border ${isHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
        >
          {isHealthy ? 'System Operational' : 'System Degraded'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceStatCard
          title="Redis Connection"
          value={health?.redis || 'disconnected'}
          icon={<Database className="w-5 h-5" />}
        />
        <FinanceStatCard
          title="Total Active Jobs"
          value={
            (health?.queues?.settlement?.active || 0) +
            (health?.queues?.payout?.active || 0) +
            (health?.queues?.reconciliation?.active || 0) +
            (health?.queues?.ownerPayable?.active || 0)
          }
          icon={<Activity className="w-5 h-5" />}
        />
        <FinanceStatCard
          title="Dead Letter Jobs"
          value={health?.queues?.deadLetter?.count || 0}
          icon={<AlertCircle className="w-5 h-5" />}
          trend={
            health?.queues?.deadLetter?.count > 0
              ? { value: 'Requires Attention', isPositive: false }
              : undefined
          }
        />
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Queue Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['settlement', 'payout', 'reconciliation', 'ownerPayable'].map((qName) => (
          <div key={qName} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 capitalize">{qName} Queue</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Waiting</span>
                <span className="text-white">{health?.queues?.[qName]?.waiting || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active</span>
                <span className="text-emerald-400">{health?.queues?.[qName]?.active || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Failed</span>
                <span className="text-red-400">{health?.queues?.[qName]?.failed || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
