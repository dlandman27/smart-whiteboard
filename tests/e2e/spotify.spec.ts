import { test, expect } from '@playwright/test'

/**
 * Spotify integration flow.
 * Skipped unless SPOTIFY_TEST_CONNECTED=1 is set.
 *
 * Set up:
 *   1. Authenticate Spotify via the app's Connectors page (test account).
 *   2. Run: SPOTIFY_TEST_CONNECTED=1 npx playwright test spotify
 */

test.describe('Spotify integration', () => {
  test.skip(process.env.SPOTIFY_TEST_CONNECTED !== '1', 'requires SPOTIFY_TEST_CONNECTED=1')

  test('GET /api/spotify/status returns connected status', async ({ request }) => {
    const res = await request.get('/api/spotify/status')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('connected')
    expect(body.connected).toBe(true)
  })

  test('GET /api/spotify/current returns track or null', async ({ request }) => {
    const res = await request.get('/api/spotify/current')
    expect([200, 204]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      // Either a track object or null (nothing playing)
      expect(body === null || typeof body === 'object').toBe(true)
    }
  })

  test('SpotifyWidget shows on board when connected', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const spotifyWidget = page.locator('[data-testid*="spotify"], [class*="spotify"]').first()
    await expect(spotifyWidget).toBeVisible({ timeout: 10_000 })
  })
})
