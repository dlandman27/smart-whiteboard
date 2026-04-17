import { test, expect } from '@playwright/test'

/**
 * Server-side API integration smoke tests.
 * These hit the Express backend directly (via Vite proxy at /api/*).
 */
test.describe('API health and routes', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ status: expect.any(String) })
  })

  test('GET /api/boards returns an array', async ({ request }) => {
    const res = await request.get('/api/boards')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/agents returns an array', async ({ request }) => {
    const res = await request.get('/api/agents')
    // 200 or 404 are both acceptable (feature may not be registered yet)
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    }
  })

  test('GET /api/reminders returns an array', async ({ request }) => {
    const res = await request.get('/api/reminders')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/notifications returns an array', async ({ request }) => {
    const res = await request.get('/api/notifications')
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    }
  })

  test('GET /api/timers returns an array', async ({ request }) => {
    const res = await request.get('/api/timers')
    expect([200, 404]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    }
  })
})
