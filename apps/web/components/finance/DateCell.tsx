import { format, formatDistanceToNow } from 'date-fns'

interface DateCellProps {
  date: string | Date | null | undefined
  showRelative?: boolean
}

export function DateCell({ date, showRelative = false }: DateCellProps) {
  if (!date) {
    return <span className="text-gray-500">-</span>
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (showRelative) {
    return (
      <div className="text-sm text-gray-300" title={format(dateObj, 'PPpp')}>
        {formatDistanceToNow(dateObj, { addSuffix: true })}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-200">{format(dateObj, 'MMM d, yyyy')}</span>
      <span className="text-xs text-gray-500">{format(dateObj, 'HH:mm:ss')}</span>
    </div>
  )
}
