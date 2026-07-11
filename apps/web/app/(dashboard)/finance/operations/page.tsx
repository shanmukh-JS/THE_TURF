import React from 'react'
import { FinanceTable } from '../../../../components/finance/FinanceTable'
// This is a stub for the Operations Dashboard.
// It uses SWR (or similar polling) for Live Queue Metrics, Webhook Logs, etc.

export default function OperationsDashboard() {
  return (
    <div className="p-8 space-y-8 bg-zinc-950 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Operations Center</h1>
        <p className="text-zinc-400 mt-2">
          Monitor queues, scheduler health, and webhooks in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quick Health Metrics - Polled every 5s */}
        <div className="bg-zinc-900 border border-emerald-900/50 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Settlement Queue
          </h3>
          <p className="text-3xl font-semibold mt-2 text-white">
            0 <span className="text-sm text-zinc-500 font-normal">waiting</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-emerald-900/50 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Payout Queue
          </h3>
          <p className="text-3xl font-semibold mt-2 text-white">
            0 <span className="text-sm text-zinc-500 font-normal">waiting</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-emerald-900/50 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Dead Letter
          </h3>
          <p className="text-3xl font-semibold mt-2 text-rose-500">
            0 <span className="text-sm text-zinc-500 font-normal">failed</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-emerald-900/50 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Scheduler Health
          </h3>
          <p className="text-3xl font-semibold mt-2 text-emerald-400">
            OK <span className="text-sm text-zinc-500 font-normal">Online</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-emerald-400 border-b border-zinc-800 pb-2">
          Webhook Logs
        </h2>
        {/* Placeholder for webhook logs table. 
            Real implementation would fetch from /api/webhooks/logs and offer a "Replay" action button. */}
        <FinanceTable
          columns={[
            { header: 'Event ID', accessorKey: 'event_id' },
            { header: 'Provider', accessorKey: 'provider' },
            { header: 'Status', accessorKey: 'processing_status' },
            { header: 'Received', accessorKey: 'received_at' },
          ]}
          data={[]}
        />
      </div>
    </div>
  )
}
