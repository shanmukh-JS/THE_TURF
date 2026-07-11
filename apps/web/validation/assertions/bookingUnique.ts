import { createClient } from '@supabase/supabase-js'
import { ScenarioContext } from '../config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Asserts that a specific slot has AT MOST ONE confirmed booking globally.
 */
export async function assertBookingUnique(context: ScenarioContext): Promise<void> {
  if (!context.state.targetSlotId) {
    throw new Error('assertBookingUnique requires targetSlotId in context state')
  }

  const { data, error, count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })
    .eq('slot_id', context.state.targetSlotId)
    .eq('status', 'CONFIRMED')

  if (error) {
    throw new Error(`Failed to query bookings: ${error.message}`)
  }

  if (count && count > 1) {
    context.metrics.doubleBookingCount = (context.metrics.doubleBookingCount || 0) + 1
    throw new Error(
      `CRITICAL: Double Booking Detected! Found ${count} confirmed bookings for slot ${context.state.targetSlotId}`
    )
  }

  context.logs.push(`Assertion PASS: Slot ${context.state.targetSlotId} is uniquely booked.`)
}
