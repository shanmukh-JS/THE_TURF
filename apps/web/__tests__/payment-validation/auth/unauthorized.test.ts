import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

describe('Security: Unauthorized Access', () => {
  // Test 1: Unauthorized Access
  it('should block unauthenticated requests to update-status with 401', async () => {
    const res = await fetch(`${API_BASE}/bookings/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'test-id', status: 'CONFIRMED' }),
    })

    expect(res.status).toBe(401)
  })

  // We would also add a test for a standard player receiving a 403,
  // which requires a valid JWT for a player in the setup phase.
})
