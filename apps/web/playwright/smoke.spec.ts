import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Production Smoke Tests (Post-Deployment)', () => {
  test.describe('Public APIs & Pages', () => {
    test('API Health endpoint should return 200', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`)
      expect(response.status()).toBe(200)
    })

    test('Homepage loads correctly', async ({ page }) => {
      await page.goto(BASE_URL)
      await expect(page).toHaveTitle(/TRUF GAMING/)
      // Verify hero section is visible
      await expect(page.locator('h1')).toBeVisible()
    })

    test('Venue search and catalog renders correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/venues`)
      // Ensure the search input is loaded
      await expect(page.getByPlaceholder('Search by city or venue name')).toBeVisible()
      // Ensure at least one venue card is rendered (assuming mock data exists)
      const venues = page.locator('[data-testid="venue-card"]')
      await expect(venues.first()).toBeVisible({ timeout: 10000 })
    })

    test('Venue details page loads correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/venues/test-venue-1`)
      // Check that the booking calendar is visible
      await expect(page.getByTestId('slot-calendar')).toBeVisible()
    })
  })

  test.describe('Authentication & Dashboards', () => {
    // For smoke tests, these rely on seed/test accounts setup in the target DB
    const TEST_OWNER_EMAIL = process.env.TEST_OWNER_EMAIL || 'owner@trufgaming.com'
    const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@trufgaming.com'
    const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!'

    test('Owner dashboard is accessible after login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`)
      await page.fill('input[name="email"]', TEST_OWNER_EMAIL)
      await page.fill('input[name="password"]', TEST_PASSWORD)
      await page.click('button[type="submit"]')

      // Verify redirect to owner dashboard
      await page.waitForURL('**/owner')
      await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible()
      await expect(page.getByTestId('venue-metrics-card')).toBeVisible()
    })

    test('Admin dashboard is accessible after login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/login`)
      await page.fill('input[name="email"]', TEST_ADMIN_EMAIL)
      await page.fill('input[name="password"]', TEST_PASSWORD)
      await page.click('button[type="submit"]')

      // Verify redirect to admin dashboard
      await page.waitForURL('**/admin')
      await expect(page.getByTestId('system-health-status')).toBeVisible()
    })
  })

  test.describe('Critical Business Flows', () => {
    test('Booking initiation validates payload and handles sandbox checkout', async ({
      request,
    }) => {
      const response = await request.post(`${BASE_URL}/api/bookings/checkout`, {
        data: {
          slotId: 'test-slot-123',
          venueId: 'test-venue-1',
          customerId: 'test-user-123',
          totalAmount: 1000,
          advancePaid: 500,
        },
        headers: {
          'x-test-sandbox': 'true', // Bypass actual Razorpay creation in smoke tests
        },
      })

      // If the slot is unavailable, it should safely return 409, not 500.
      expect([200, 409]).toContain(response.status())
    })
  })
})
