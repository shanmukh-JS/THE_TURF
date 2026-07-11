import { join } from 'path'
import { generateReport } from './report'
import { ScenarioResult, ValidationMetrics } from './config'

export type ValidationContext = {
  scenarioName: string
  metrics: ValidationMetrics
  logs: string[]
}

export interface ValidationScenario {
  name: string
  description: string
  arrange: () => Promise<any>
  act: (context: any) => Promise<any>
  observe: (context: any) => Promise<ValidationMetrics>
  assert: (context: any, metrics: ValidationMetrics) => Promise<void>
}

export class ValidationRunner {
  private scenarios: ValidationScenario[] = []
  private results: ScenarioResult[] = []

  register(scenario: ValidationScenario) {
    this.scenarios.push(scenario)
  }

  async runAll() {
    console.log(`Starting Validation Harness - ${this.scenarios.length} Scenarios Loaded`)

    for (const scenario of this.scenarios) {
      await this.runScenario(scenario)
    }

    await generateReport(this.results)
  }

  private async runScenario(scenario: ValidationScenario) {
    const startTime = Date.now()
    let passed = true
    let failureDetail = ''
    const logs: string[] = []

    console.log(`\n▶ Executing: ${scenario.name}`)

    try {
      console.log('  [Arrange] Setting up state...')
      const context = await scenario.arrange()

      console.log('  [Act] Executing scenario...')
      const actResult = await scenario.act(context)

      console.log('  [Observe] Capturing metrics and state...')
      const metrics = await scenario.observe({ ...context, actResult })

      console.log('  [Assert] Verifying system invariants...')
      await scenario.assert({ ...context, actResult }, metrics)

      console.log(`  ✅ Passed: ${scenario.name}`)
    } catch (error: any) {
      passed = false
      failureDetail = error.message
      console.error(`  ❌ Failed: ${scenario.name} - ${failureDetail}`)
    } finally {
      const durationMs = Date.now() - startTime
      this.results.push({
        scenarioName: scenario.name,
        passed,
        durationMs,
        failureDetail,
        logs,
      })
    }
  }
}
