// Set env vars before any module loading - these are captured as module-level constants
vi.hoisted(() => {
  process.env.TODOIST_CLIENT_ID = 'test-client-id'
  process.env.TODOIST_CLIENT_SECRET = 'test-client-secret'
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../services/credentials.js', () => ({
  saveOAuthTokens: vi.fn(),
  loadOAuthTokens: vi.fn(),
  deleteOAuthTokens: vi.fn(),
}))

import { todoistRouter } from './todoist.js'
import * as credentials from '../services/credentials.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', todoistRouter())
  app.use(errorMiddleware)
  return app
}

describe('todoist router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  // ── Status ──────────────────────────────────────────────────────────────────

  describe('GET /api/todoist/status', () => {
    it('returns connected:true and configured:true when tokens exist', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      const res = await request(createApp()).get('/api/todoist/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(true)
      expect(res.body.configured).toBe(true)
    })

    it('returns connected:false when no tokens', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/todoist/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
    })
  })

  // ── Connect ─────────────────────────────────────────────────────────────────

  describe('POST /api/todoist/connect', () => {
    it('returns OAuth URL when configured', async () => {
      const res = await request(createApp()).post('/api/todoist/connect')
      expect(res.status).toBe(200)
      expect(res.body.url).toContain('todoist.com/oauth/authorize')
      expect(res.body.url).toContain('client_id=test-client-id')
    })
  })

  // ── Callback ─────────────────────────────────────────────────────────────────

  describe('GET /api/todoist/callback', () => {
    it('returns 400 on OAuth error param', async () => {
      const res = await request(createApp()).get('/api/todoist/callback?error=access_denied')
      expect(res.status).toBe(400)
    })

    it('returns 400 on invalid state', async () => {
      const res = await request(createApp()).get('/api/todoist/callback?code=abc&state=invalid-state')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/invalid or expired/i)
    })

    it('returns 400 when code is missing', async () => {
      const res = await request(createApp()).get('/api/todoist/callback?state=some-state')
      expect(res.status).toBe(400)
    })
  })

  // ── Disconnect ───────────────────────────────────────────────────────────────

  describe('POST /api/todoist/disconnect', () => {
    it('deletes tokens and returns ok:true', async () => {
      vi.mocked(credentials.deleteOAuthTokens).mockResolvedValue(undefined)
      const res = await request(createApp()).post('/api/todoist/disconnect')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(credentials.deleteOAuthTokens).toHaveBeenCalledWith('test-user-id', 'todoist')
    })
  })

  // ── Projects ─────────────────────────────────────────────────────────────────

  describe('GET /api/todoist/projects', () => {
    it('returns projects list (bare array)', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 'p1', name: 'Work' }, { id: 'p2', name: 'Personal' }],
      } as any)

      const res = await request(createApp()).get('/api/todoist/projects')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('handles v1 wrapped response { results: [...] }', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ id: 'p1', name: 'Work' }] }),
      } as any)

      // Need fresh app to bypass cache
      const res = await request(createApp()).get('/api/todoist/projects')
      expect(res.status).toBe(200)
      // Results unwrapped correctly
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/todoist/projects')
      expect(res.status).toBe(401)
    })

    it('propagates Todoist API errors on tasks endpoint', async () => {
      // Use tasks endpoint (no project cache involved) to test API error propagation
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok-err-403' })
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as any)

      // tasks?filter=xyz gives a unique cache key that won't conflict
      const res = await request(createApp()).get('/api/todoist/tasks?filter=overdue-err-test')
      expect(res.status).toBe(403)
    })
  })

  // ── Tasks ────────────────────────────────────────────────────────────────────

  describe('GET /api/todoist/tasks', () => {
    it('returns tasks list', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 't1', content: 'Buy milk' }],
      } as any)

      const res = await request(createApp()).get('/api/todoist/tasks')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
    })

    it('filters by projectId when provided', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as any)

      await request(createApp()).get('/api/todoist/tasks?projectId=p1')
      const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(fetchUrl).toContain('project_id=p1')
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/todoist/tasks')
      expect(res.status).toBe(401)
    })
  })

  // ── Complete task ─────────────────────────────────────────────────────────────

  describe('POST /api/todoist/tasks/:id/complete', () => {
    it('completes task and returns ok:true', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as any)

      const res = await request(createApp()).post('/api/todoist/tasks/t1/complete')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp()).post('/api/todoist/tasks/t1/complete')
      expect(res.status).toBe(401)
    })
  })

  // ── Reopen task ───────────────────────────────────────────────────────────────

  describe('POST /api/todoist/tasks/:id/reopen', () => {
    it('reopens task and returns ok:true', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as any)

      const res = await request(createApp()).post('/api/todoist/tasks/t1/reopen')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  // ── Create project ────────────────────────────────────────────────────────────

  describe('POST /api/todoist/projects', () => {
    it('creates and returns a project', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-p', name: 'Side Project' }),
      } as any)

      const res = await request(createApp())
        .post('/api/todoist/projects')
        .send({ name: 'Side Project' })
      expect(res.status).toBe(200)
      expect(res.body.id).toBe('new-p')
    })

    it('returns 400 when name is empty', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      const res = await request(createApp())
        .post('/api/todoist/projects')
        .send({ name: '   ' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/project name is required/i)
    })

    it('returns 400 when name is missing', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      const res = await request(createApp())
        .post('/api/todoist/projects')
        .send({})
      expect(res.status).toBe(400)
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp())
        .post('/api/todoist/projects')
        .send({ name: 'New Project' })
      expect(res.status).toBe(401)
    })
  })

  // ── Create task ───────────────────────────────────────────────────────────────

  describe('POST /api/todoist/tasks', () => {
    it('creates and returns a task', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-t', content: 'Write tests' }),
      } as any)

      const res = await request(createApp())
        .post('/api/todoist/tasks')
        .send({ content: 'Write tests', projectId: 'p1', dueString: 'today' })
      expect(res.status).toBe(200)
      expect(res.body.id).toBe('new-t')
    })

    it('returns 400 when content is empty', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      const res = await request(createApp())
        .post('/api/todoist/tasks')
        .send({ content: '' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/task content is required/i)
    })

    it('returns 400 when content is whitespace', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue({ access_token: 'tok123' })
      const res = await request(createApp())
        .post('/api/todoist/tasks')
        .send({ content: '   ' })
      expect(res.status).toBe(400)
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(credentials.loadOAuthTokens).mockResolvedValue(null)
      const res = await request(createApp())
        .post('/api/todoist/tasks')
        .send({ content: 'Some task' })
      expect(res.status).toBe(401)
    })
  })
})
