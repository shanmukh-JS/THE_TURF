'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

interface EarningsDataPoint {
  label: string
  revenue: number
  commission: number
}

interface EarningsChartProps {
  data: EarningsDataPoint[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl">
        <p className="text-gray-300 font-medium mb-2">{label}</p>
        <p className="text-emerald-400 text-sm">
          Net Earnings: ₹{payload[0].value?.toLocaleString()}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Platform Fee: ₹{payload[1].value?.toLocaleString()}
        </p>
      </div>
    )
  }

  return null
}

export function EarningsChart({ data }: EarningsChartProps) {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₹${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
          <Bar dataKey="revenue" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
          <Bar dataKey="commission" stackId="a" fill="#374151" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
