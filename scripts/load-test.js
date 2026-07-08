import http from 'k6/http'
import { check, sleep } from 'k6'

// ============================================================================
// TRUF GAMING — Load Testing (k6)
// Simulates concurrent users hitting the API to ensure stability.
// Run with: k6 run scripts/load-test.js
// ============================================================================

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
}

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api'

export default function () {
  // 1. Health check endpoint (Read-heavy simulation)
  const healthRes = http.get(`${BASE_URL}/health`)
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  })

  // Simulate user reading wait time
  sleep(1)

  // 2. Fetch available slots (Database read-heavy simulation)
  // Assuming a static venue ID for testing purposes
  const venueId = 'test-venue-id-1234'
  const date = '2026-10-15'
  
  // NOTE: This route needs to exist in your actual implementation,
  // typically something like /api/venues/[id]/slots?date=...
  const slotsRes = http.get(`${BASE_URL}/venues/${venueId}/slots?date=${date}`)
  check(slotsRes, {
    'slots check status is 200 or 404': (r) => [200, 404].includes(r.status),
  })

  sleep(2)
}
