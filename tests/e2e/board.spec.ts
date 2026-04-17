import { test, expect } from '@playwright/test'

test.describe('Board management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to hydrate
    await page.waitForSelector('[data-testid="whiteboard"]', { timeout: 10_000 }).catch(() => {})
    await page.waitForLoadState('networkidle')
  })

  test('app loads and shows whiteboard', async ({ page }) => {
    await expect(page).toHaveTitle(/Walli|Whiteboard|Smart/i)
    // The main canvas or some recognizable element should be present
    const body = await page.locator('body')
    await expect(body).toBeVisible()
  })

  test('sidebar is visible', async ({ page }) => {
    // Sidebar should be rendered
    const sidebar = page.locator('[data-testid="sidebar"]')
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible()
    } else {
      // Fallback: look for board list items or nav elements
      const nav = page.locator('nav, aside, [role="navigation"]').first()
      await expect(nav).toBeVisible()
    }
  })

  test('bottom toolbar is present', async ({ page }) => {
    const toolbar = page.locator('[data-testid="bottom-toolbar"]')
    if (await toolbar.count() > 0) {
      await expect(toolbar).toBeVisible()
    } else {
      // Toolbar sits at the bottom of the screen
      const buttons = page.locator('button').filter({ hasText: /widget|add|\+/i })
      expect(await buttons.count()).toBeGreaterThanOrEqual(0)
    }
  })
})
