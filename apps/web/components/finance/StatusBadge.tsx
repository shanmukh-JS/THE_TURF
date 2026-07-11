export type StatusType =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED'

interface StatusBadgeProps {
  status: StatusType | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase()

  let colors = 'bg-gray-500/10 text-gray-400 border-gray-500/20' // Default

  if (['COMPLETED', 'SETTLED', 'SUCCESS'].includes(normalized)) {
    colors = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  } else if (['PENDING', 'DRAFT', 'QUEUED'].includes(normalized)) {
    colors = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  } else if (['PROCESSING', 'IN_TRANSIT', 'ACTIVE'].includes(normalized)) {
    colors = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  } else if (['FAILED', 'REJECTED', 'CANCELLED', 'DEAD_LETTER'].includes(normalized)) {
    colors = 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}
    >
      {normalized}
    </span>
  )
}
