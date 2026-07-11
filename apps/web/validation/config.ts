export type ValidationMetrics = {
  p50LatencyMs?: number
  p95LatencyMs?: number
  p99LatencyMs?: number
  errorRate?: number
  maxDbConnections?: number
  queueDepthEnd?: number
  ledgerImbalanceCount?: number
  doubleBookingCount?: number
}

export type ScenarioResult = {
  scenarioName: string
  passed: boolean
  durationMs: number
  failureDetail?: string
  logs: string[]
}

export type ScenarioContext = {
  metadata: {
    scenarioName: string
    startTime: Date
    version: string
  }
  metrics: ValidationMetrics
  logs: string[]
  state: Record<string, any> // Used to pass IDs (e.g. targetSlotId) between Act and Assert
}
