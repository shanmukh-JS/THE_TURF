import { ValidationScenario } from '../runner'
import { ScenarioContext, ValidationMetrics } from '../config'
import { assertLedgerBalanced } from '../assertions/ledgerBalanced'
import { assertBookingUnique } from '../assertions/bookingUnique'
import axios from 'axios'
import crypto from 'crypto'

export const bookingCollisionScenario: ValidationScenario = {
  name: 'Booking Collision under Extreme Load',
  description:
    'Proves the system strictly prevents double bookings when 1,000 requests hit the same slot simultaneously, and ensures no orphan ledger entries.',

  arrange: async (): Promise<ScenarioContext> => {
    // Generate a shared context block
    return {
      metadata: {
        scenarioName: 'Booking Collision under Extreme Load',
        startTime: new Date(),
        version: 'v1.0',
      },
      metrics: {},
      logs: [],
      state: {
        targetSlotId: 'SLOT_COLLISION_TEST_123',
        targetVenueId: 'VENUE_TEST_123',
      },
    }
  },

  act: async (context: ScenarioContext): Promise<void> => {
    context.logs.push('Executing 1,000 concurrent booking POST requests...')
    const API_URL = 'http://localhost:3000/api/bookings/create'

    const requests = Array.from({ length: 1000 }).map(() => {
      const customerId = crypto.randomUUID()
      return axios.post(
        API_URL,
        {
          slotId: context.state.targetSlotId,
          venueId: context.state.targetVenueId,
          customerId,
        },
        { validateStatus: () => true }
      ) // Do not throw on 4xx/5xx
    })

    const results = await Promise.all(requests)

    const successes = results.filter((r: any) => r.status === 201 || r.status === 200).length
    const conflicts = results.filter((r: any) => r.status === 409).length

    context.logs.push(`HTTP Results -> Success: ${successes} | Conflicts: ${conflicts}`)
  },

  observe: async (context: ScenarioContext): Promise<ValidationMetrics> => {
    // In a real harness, query Prometheus/Redis for latency and APM metrics here
    return {
      errorRate: 0, // Mocked metric
    }
  },

  assert: async (context: ScenarioContext, metrics: ValidationMetrics): Promise<void> => {
    context.logs.push('Validating absolute systemic invariants...')

    // Invariant 1: Exactly 0 or 1 booking exists
    await assertBookingUnique(context)

    // Invariant 2: Financial Ledger remained perfectly balanced (no orphaned deposits)
    await assertLedgerBalanced(context)
  },
}
