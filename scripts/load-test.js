import http from 'k6/http'
import { check, sleep } from 'k6'

// ============================================================================
// TRUF GAMING — Load Testing (k6)
// Simulates concurrent users hitting the API to ensure stability.
// Run with: 
// k6 run -e SCENARIO=browse scripts/load-test.js
// k6 run -e SCENARIO=search scripts/load-test.js
// k6 run -e SCENARIO=book scripts/load-test.js
// k6 run -e SCENARIO=mixed scripts/load-test.js
// ============================================================================

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api'
const SCENARIO = __ENV.SCENARIO || 'mixed'

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      env: { SCENARIO: 'browse' },
      exec: 'browseVenues',
      tags: { test_type: 'browse' },
    },
    search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      env: { SCENARIO: 'search' },
      exec: 'searchSlots',
      tags: { test_type: 'search' },
    },
    book: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      env: { SCENARIO: 'book' },
      exec: 'bookSlot',
      tags: { test_type: 'book' },
    },
  },
  thresholds: {
    // Browse (Cached) - P95 < 150ms
    'http_req_duration{test_type:browse}': ['p(95)<150'],
    // Search (Dynamic DB) - P95 < 300ms
    'http_req_duration{test_type:search}': ['p(95)<300'],
    // Book (Write DB lock) - P95 < 800ms
    'http_req_duration{test_type:book}': ['p(95)<800'],
    // Global Error Rate
    http_req_failed: ['rate<0.01'], 
  },
}

// 1. Browse Venues (Expected to hit ISR Cache)
export function browseVenues() {
  const res = http.get(`${BASE_URL}/venues`)
  check(res, {
    'status is 200': (r) => r.status === 200,
  })
  sleep(1)
}

// 2. Search Slots (Expected to hit Database heavily)
export function searchSlots() {
  const venueId = 'test-venue-id-1234'
  const date = '2026-10-15'
  const res = http.get(`${BASE_URL}/venues/${venueId}/slots?date=${date}`)
  check(res, {
    'status is 200': (r) => r.status === 200,
  })
  sleep(2)
}

// 3. Book Slot (Expected to acquire row locks)
export function bookSlot() {
  const venueId = 'test-venue-id-1234'
  const payload = JSON.stringify({
    slotId: 'test-slot-uuid',
    venueId,
    customerId: 'test-user-uuid',
    totalAmount: 1000,
    advancePaid: 500,
  })

  const headers = { 'Content-Type': 'application/json' }
  const res = http.post(`${BASE_URL}/bookings/checkout`, payload, { headers })
  
  // We expect either a success (200) or a legitimate lock conflict (409) if concurrent
  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
  })
  sleep(5)
}

// The 'mixed' scenario can be executed by k6 natively if we configure the scenarios block to run simultaneously.
// Above configuration runs them in parallel if we just do `k6 run scripts/load-test.js`.
