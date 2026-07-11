import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseKey)

// Fixed test data IDs
export const TEST_USER_ID = 'test-user-0000-0000-0000-000000000000'
export const TEST_OWNER_ID = 'test-owner-0000-0000-0000-000000000000'
export const TEST_VENUE_ID = 'test-venue-0000-0000-0000-000000000000'
export const TEST_SLOT_ID = 'test-slot-0000-0000-0000-000000000000'

/**
 * Resilient cleanup before/after tests
 * Ensures the database state is pristine.
 */
export async function cleanupDatabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Skipping cleanup: Missing Supabase credentials')
    return
  }

  // 1. Delete all audit logs for test user
  await supabase.from('payment_audit').delete().eq('user_id', TEST_USER_ID)

  // 2. Delete all webhook logs
  await supabase.from('webhook_logs').delete().eq('provider', 'razorpay')

  // 3. Delete all queue jobs related to this slot/user
  await supabase
    .from('notification_outbox')
    .delete()
    .contains('payload', { customerId: TEST_USER_ID })

  // 4. Delete all test bookings
  await supabase.from('bookings').delete().eq('customer_id', TEST_USER_ID)

  // 5. Unlock the test slot securely
  await supabase
    .from('slots')
    .update({ status: 'Available', is_booked: false, is_locked: false, lock_expires: null })
    .eq('id', TEST_SLOT_ID)
}

/**
 * Setup fixed test data
 */
export async function setupTestData() {
  if (!supabaseUrl || !supabaseKey) return

  // In a real execution, we would INSERT the test user, owner, venue, and slot here
  // taking care of ON CONFLICT DO NOTHING to ensure idempotency of the setup script.
}
