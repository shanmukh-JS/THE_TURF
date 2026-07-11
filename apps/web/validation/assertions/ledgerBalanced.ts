import { createClient } from '@supabase/supabase-js'
import { ScenarioContext } from '../config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Asserts that the double-entry accounting ledger is perfectly balanced.
 * SUM(debit) MUST equal SUM(credit) for all active journals in the scenario timeframe.
 */
export async function assertLedgerBalanced(context: ScenarioContext): Promise<void> {
  const { data, error } = await supabase.rpc('validate_ledger_integrity', {
    start_time: context.metadata.startTime.toISOString(),
    end_time: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to query ledger: ${error.message}`)
  }

  // Expecting the RPC to return a net balance of exactly 0 across all asset/liability accounts
  if (!data || data.net_balance !== 0) {
    context.metrics.ledgerImbalanceCount = (context.metrics.ledgerImbalanceCount || 0) + 1
    throw new Error(`Ledger Imbalance Detected! Net Difference: ${data?.net_balance || 'Unknown'}`)
  }

  context.logs.push('Assertion PASS: Ledger is perfectly balanced.')
}
