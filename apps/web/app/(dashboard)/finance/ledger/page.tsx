import { LedgerClient, JournalEntry } from './LedgerClient'
import { Download } from 'lucide-react'

export const revalidate = 0 // Always fetch fresh ledger data

export default async function LedgerPage() {
  // In reality, this would fetch from Supabase `financial_journals` table
  // const supabase = createClient(...)
  // const { data } = await supabase.from('financial_journals').select('*').order('created_at', { ascending: false });

  // Mock data for demonstration
  const data: JournalEntry[] = [
    {
      id: '1',
      journal_number: 'JNL-2026-07-001',
      transaction_id: 'TRX-12345-67890',
      debit_account: 'PLATFORM_ESCROW',
      credit_account: 'OWNER_PAYABLE',
      amount: 150000, // 1500 INR
      currency: 'INR',
      created_at: new Date().toISOString(),
      status: 'POSTED',
    },
    {
      id: '2',
      journal_number: 'JNL-2026-07-002',
      transaction_id: 'TRX-12345-67891',
      debit_account: 'OWNER_PAYABLE',
      credit_account: 'CASH_OUT',
      amount: 150000,
      currency: 'INR',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      status: 'POSTED',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Immutable Ledger</h1>
          <p className="text-sm text-gray-400 mt-1">
            Read-only view of all financial journal entries.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <LedgerClient data={data} />
    </div>
  )
}
