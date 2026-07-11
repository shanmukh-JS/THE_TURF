export function formatMoney(amountPaise: number, currency = 'INR'): string {
  // Convert minor units (paise) to major units (rupees)
  const amount = amountPaise / 100

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface AmountCellProps {
  amount: number
  currency?: string
  isDebit?: boolean
}

export function AmountCell({ amount, currency = 'INR', isDebit }: AmountCellProps) {
  const formatted = formatMoney(Math.abs(amount), currency)

  // If isDebit is true, we might want to color it differently
  // For ledger entries, debits could be normal, but for general tables, negatives might be red
  const isNegative = amount < 0 || isDebit

  return (
    <div
      className={`font-medium tabular-nums text-right ${isNegative ? 'text-red-400' : 'text-gray-100'}`}
    >
      {isNegative ? '-' : ''}
      {formatted}
    </div>
  )
}
