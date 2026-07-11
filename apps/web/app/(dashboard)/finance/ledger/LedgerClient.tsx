'use client'

import { ColumnDef } from '@tanstack/react-table'
import { FinanceTable } from '@/components/finance/FinanceTable'
import { AmountCell } from '@/components/finance/AmountCell'
import { DateCell } from '@/components/finance/DateCell'
import { StatusBadge } from '@/components/finance/StatusBadge'

export type JournalEntry = {
  id: string
  journal_number: string
  transaction_id: string
  debit_account: string
  credit_account: string
  amount: number
  currency: string
  created_at: string
  status: string
}

const columns: ColumnDef<JournalEntry>[] = [
  {
    accessorKey: 'journal_number',
    header: 'Journal No.',
  },
  {
    accessorKey: 'transaction_id',
    header: 'Transaction ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-400">
        {row.original.transaction_id.split('-')[0]}...
      </span>
    ),
  },
  {
    accessorKey: 'debit_account',
    header: 'Debit',
    cell: ({ row }) => <StatusBadge status={row.original.debit_account} />,
  },
  {
    accessorKey: 'credit_account',
    header: 'Credit',
    cell: ({ row }) => <StatusBadge status={row.original.credit_account} />,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <AmountCell amount={row.original.amount} currency={row.original.currency} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => <DateCell date={row.original.created_at} />,
  },
]

export function LedgerClient({ data }: { data: JournalEntry[] }) {
  return <FinanceTable columns={columns} data={data} />
}
