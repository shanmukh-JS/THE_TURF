import { ReactNode } from 'react'

interface FinanceStatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  description?: string
}

export function FinanceStatCard({ title, value, icon, trend, description }: FinanceStatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg">{icon}</div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-100">{value}</div>
        {(trend || description) && (
          <div className="mt-2 flex items-center text-sm">
            {trend && (
              <span
                className={`font-medium ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}
              >
                {trend.isPositive ? '+' : '-'}
                {trend.value}
              </span>
            )}
            {description && <span className="text-gray-500 ml-2">{description}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
