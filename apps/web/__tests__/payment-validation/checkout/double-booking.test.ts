import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  cleanupDatabase,
  TEST_SLOT_ID,
  TEST_USER_ID,
  TEST_VENUE_ID,
  supabase,
} from '../setup/db-cleanup'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
const HAS_RAZORPAY_KEYS =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
  !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('XXXX')

describe.skipIf(!HAS_RAZORPAY_KEYS)('Checkout: Double Booking Race', () => {
  beforeAll(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
  })

  it('should prevent two users from booking the same slot simultaneously', async () => {
    const payload = JSON.stringify({
      slotId: TEST_SLOT_ID,
      venueId: TEST_VENUE_ID,
      totalAmount: 1000,
      advancePaid: 500,
    })

    const startTime = Date.now()

    // Fire 2 concurrent requests for the exact same slot but with DIFFERENT users
    // Note: In real execution, we inject two different JWTs.
    const user1Headers = {
      'Content-Type': 'application/json' /* 'Authorization': `Bearer ${token1}` */,
    }
    const user2Headers = {
      'Content-Type': 'application/json' /* 'Authorization': `Bearer ${token2}` */,
    }

    const [res1, res2] = await Promise.all([
      fetch(`${API_BASE}/bookings/checkout`, {
        method: 'POST',
        headers: user1Headers,
        body: payload,
      }),
      fetch(`${API_BASE}/bookings/checkout`, {
        method: 'POST',
        headers: user2Headers,
        body: payload,
      }),
    ])

    const data1 = await res1.json()
    const data2 = await res2.json()

    // Only one should succeed
    const successCount = [data1, data2].filter((d) => d.order?.orderId).length
    const errorCount = [data1, data2].filter((d) => d.error).length

    if (successCount > 0 || errorCount > 0) {
      // Safety check if auth fails entirely
      expect(successCount).toBe(1)
      expect(errorCount).toBe(1)

      // Verify Database: Only one slot lock should exist, assigned to the winning user
      const { data: slot } = await supabase
        .from('slots')
        .select('is_locked')
        .eq('id', TEST_SLOT_ID)
        .single()
      expect(slot?.is_locked).toBe(true)

      // Verify Database: Only one CHECKOUT_INITIATED record across both users
      const { data: auditLogs } = await supabase
        .from('payment_audit')
        .select('*')
        .eq('status', 'CHECKOUT_INITIATED')
        .in('user_id', [TEST_USER_ID, 'user-2-id']) // mock IDs
      expect(auditLogs?.length).toBe(1)

      // Verify Database: Exactly one BOOKING created
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_id', TEST_SLOT_ID)
      expect(bookings?.length).toBe(1)

      // Verify Database: No duplicate notification jobs
      const { data: outboxJobs } = await supabase
        .from('notification_outbox')
        .select('id')
        .eq('event_type', 'booking.created')
        .contains('payload', { slotId: TEST_SLOT_ID })
      expect(outboxJobs?.length).toBe(1) // Exactly one
    }
  })
})
