import { test, expect } from '@playwright/test'

/**
 * Notion integration flow.
 * Skipped unless NOTION_TEST_CONNECTED=1 is set.
 *
 * Set up:
 *   1. Add NOTION_API_KEY to .env pointing at a test integration.
 *   2. Share at least one database with the integration.
 *   3. Run: NOTION_TEST_CONNECTED=1 npx playwright test notion
 */

test.describe('Notion integration', () => {
  test.skip(process.env.NOTION_TEST_CONNECTED !== '1', 'requires NOTION_TEST_CONNECTED=1')

  test('GET /api/databases returns accessible databases', async ({ request }) => {
    const res = await request.get('/api/databases')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  test('GET /api/databases/:id/query returns pages', async ({ request }) => {
    // First get the list to find a real ID
    const list = await request.get('/api/databases')
    const databases = await list.json() as Array<{ id: string }>
    const firstId = databases[0]?.id
    test.skip(!firstId, 'no databases returned')

    const res = await request.post(`/api/databases/${firstId}/query`, {
      data: { page_size: 5 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('results')
    expect(Array.isArray(body.results)).toBe(true)
  })

  test('connectors page shows Notion section', async ({ page }) => {
    await page.goto('/#connectors')
    await page.waitForLoadState('networkidle')
    const notionSection = page.locator('text=/notion/i').first()
    await expect(notionSection).toBeVisible()
  })
})
