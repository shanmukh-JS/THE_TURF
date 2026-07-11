import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { DateCell } from '../DateCell'

export type TimelineStep = {
  label: string
  description: string
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'FAILED'
  date?: string | Date
}

interface SettlementTimelineProps {
  steps: TimelineStep[]
}

export function SettlementTimeline({ steps }: SettlementTimelineProps) {
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {steps.map((step, stepIdx) => (
          <li key={step.label}>
            <div className="relative pb-8">
              {stepIdx !== steps.length - 1 ? (
                <span
                  className={`absolute left-4 top-4 -ml-px h-full w-0.5 ${
                    step.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gray-800'
                  }`}
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-gray-900 ${
                      step.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : step.status === 'ACTIVE'
                          ? 'bg-blue-500/20 text-blue-500'
                          : step.status === 'FAILED'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {step.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    ) : step.status === 'ACTIVE' ? (
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p
                      className={`text-sm font-medium ${step.status === 'PENDING' ? 'text-gray-500' : 'text-gray-100'}`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{step.description}</p>
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    {step.date ? <DateCell date={step.date} showRelative /> : null}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
