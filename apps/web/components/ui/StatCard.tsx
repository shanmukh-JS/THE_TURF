import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  accent?: string
}

export function StatCard({ label, value, change, trend = 'neutral', icon, accent = 'green' }: StatCardProps) {
  const accentMap: Record<string, string> = {
    green: 'from-green-500/20 to-emerald-500/5 border-green-500/20',
    blue: 'from-blue-500/20 to-cyan-500/5 border-blue-500/20',
    amber: 'from-amber-500/20 to-orange-500/5 border-amber-500/20',
    purple: 'from-purple-500/20 to-violet-500/5 border-purple-500/20',
  }
  const iconMap: Record<string, string> = {
    green: 'bg-green-500/15 text-green-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
    purple: 'bg-purple-500/15 text-purple-400',
  }

  return (
    <div className={cn(
      'relative rounded-2xl border bg-gradient-to-br p-5 overflow-hidden',
      accentMap[accent]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconMap[accent])}>
          {icon}
        </div>
        {change && (
          <span className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trend === 'up' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>

      {/* Decorative blob */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-current opacity-5" />
    </div>
  )
}
