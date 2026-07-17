import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// TODO: Fix accessibility issues found by axe-core before un-skipping these tests
test.describe.skip('Global Accessibility', () => {
  test('Landing page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto(BASE_URL)
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Owner dashboard should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    // Note: This requires an authenticated session in a real scenario
    await page.goto(`${BASE_URL}/owner/dashboard`)
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Customer dashboard should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    // Note: This requires an authenticated session in a real scenario
    await page.goto(`${BASE_URL}/customer/dashboard`)
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })
})
