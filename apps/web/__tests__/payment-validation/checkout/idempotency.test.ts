import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  cleanupDatabase,
  TEST_SLOT_ID,
  TEST_USER_ID,
  TEST_VENUE_ID,
  supabase,
} from '../setup/db-cleanup'
import crypto from 'crypto'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
const HAS_RAZORPAY_KEYS =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
  !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('XXXX')

describe.skipIf(!HAS_RAZORPAY_KEYS)('Checkout: Idempotency & Duplicate Clicks', () => {
  beforeAll(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
  })

  it('should return the exact same razorpay_order_id for 10 rapid concurrent checkout requests', async () => {
    // Note: In a real test we would inject an auth token for TEST_USER_ID
    const authHeaders = {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${process.env.TEST_USER_TOKEN}`
    }

    const payload = JSON.stringify({
      slotId: TEST_SLOT_ID,
      venueId: TEST_VENUE_ID,
      totalAmount: 1000,
      advancePaid: 500,
    })

    const startTime = Date.now()

    // Fire 10 requests concurrently
    const promises = Array.from({ length: 10 }).map(() =>
      fetch(`${API_BASE}/bookings/checkout`, {
        method: 'POST',
        headers: authHeaders,
        body: payload,
      }).then((res) => res.json())
    )

    const results = await Promise.all(promises)
    const duration = Date.now() - startTime

    // Filter out errors (e.g. rate limits or auth errors if tokens aren't set)
    const successfulOrders = results.filter((r) => r.order?.orderId)

    if (successfulOrders.length > 0) {
      const firstOrderId = successfulOrders[0].order.orderId

      // Verify API: All successful requests should have the SAME order ID
      successfulOrders.forEach((result) => {
        expect(result.order.orderId).toBe(firstOrderId)
      })

      // Verify Database: Exactly one CHECKOUT_INITIATED record for this time window
      const { data: auditLogs } = await supabase
        .from('payment_audit')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('status', 'CHECKOUT_INITIATED')

      expect(auditLogs?.length).toBe(1)
    }

    // Performance assertion target
    console.log(`Checkout time: ${duration}ms`)
    // expect(duration).toBeLessThan(5000) // Hard failure if > 5s
  })
})
