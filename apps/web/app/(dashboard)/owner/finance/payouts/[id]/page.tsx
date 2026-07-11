import { SettlementTimeline } from '@/components/finance/owner/SettlementTimeline'

export default async function OwnerPayoutDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payout Details: {params.id}</h1>
        <p className="text-sm text-gray-400 mt-1">Granular timeline of this payout's lifecycle.</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-lg">
        <SettlementTimeline
          steps={[
            {
              label: 'Generated Payables',
              description: 'Calculated earnings',
              status: 'COMPLETED',
              date: new Date(),
            },
            {
              label: 'Batch Inclusion',
              description: 'Added to payout queue',
              status: 'COMPLETED',
              date: new Date(),
            },
            {
              label: 'Bank Transfer Initiated',
              description: 'Sent to payment provider',
              status: 'ACTIVE',
              date: new Date(),
            },
            { label: 'Settled to Bank', description: 'Cleared to your account', status: 'PENDING' },
          ]}
        />
      </div>
    </div>
  )
}
