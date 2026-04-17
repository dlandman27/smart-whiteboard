import { test, expect } from '@playwright/test'

/**
 * Google Calendar integration flow.
 *
 * These tests require real OAuth credentials.  They are skipped automatically
 * unless the GCAL_TEST_CONNECTED env var is set to "1" so that the CI/local
 * default run stays green without credentials.
 *
 * Set up:
 *   1. Create a test Google account.
 *   2. Authenticate once via the app's Connectors page.
 *   3. Export the resulting token from SQLite and point GCAL_TEST_TOKEN at it
 *      (or just leave the app logged-in and run with a real browser profile).
 *
 * Run:
 *   GCAL_TEST_CONNECTED=1 npx playwright test gcal
 */

test.describe('Google Calendar integration', () => {
  test.skip(process.env.GCAL_TEST_CONNECTED !== '1', 'requires GCAL_TEST_CONNECTED=1')

  test('connectors page shows Google Calendar section', async ({ page }) => {
    await page.goto('/#connectors')
    await page.waitForLoadState('networkidle')
    const gcalSection = page.locator('text=/google calendar/i').first()
    await expect(gcalSection).toBeVisible()
  })

  test('connected state shows calendar events in CalendarWidget', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for a calendar widget or calendar board view
    const calendarContent = page.locator('[data-testid*="calendar"], [class*="calendar"]').first()
    await expect(calendarContent).toBeVisible({ timeout: 15_000 })
  })

  test('GET /api/gcal/events returns events array when connected', async ({ request }) => {
    const res = await request.get('/api/gcal/events')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
