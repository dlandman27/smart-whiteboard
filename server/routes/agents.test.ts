import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id'
    next()
  },
}))

// ── Mock agents/index.js ──────────────────────────────────────────────────────

const mockAddUserAgent = vi.fn()
const mockRemoveUserAgent = vi.fn()
const mockUpdateUserAgent = vi.fn()
const mockBuildDynamicAgent = vi.fn()

vi.mock('../agents/index.js', () => ({
  createScheduler:    vi.fn(),
  addUserAgent:       (...args: any[]) => mockAddUserAgent(...args),
  removeUserAgent:    (...args: any[]) => mockRemoveUserAgent(...args),
  updateUserAgent:    (...args: any[]) => mockUpdateUserAgent(...args),
  buildDynamicAgent:  (...args: any[]) => mockBuildDynamicAgent(...args),
}))

import { agentsRouter } from './agents.js'

// Build a mock scheduler object with the shape the router expects
function makeMockScheduler() {
  return {
    status:     vi.fn(() => [{ id: 'task-monitor', name: 'Task Monitor', enabled: true, lastRun: null }]),
    runNow:     vi.fn().mockResolvedValue(undefined),
    setEnabled: vi.fn(),
    register:   vi.fn(),
  }
}

function createApp(scheduler = makeMockScheduler()) {
  const app = express()
  app.use(express.json())
  app.use('/api', agentsRouter(scheduler as any))
  app.use(errorMiddleware)
  return app
}

describe('agents router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /api/agents ───────────────────────────────────────────────────────

  describe('GET /api/agents', () => {
    it('returns the scheduler status', async () => {
      const res = await request(createApp()).get('/api/agents')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0].id).toBe('task-monitor')
    })
  })

  // ── POST /api/agents/:id/run ──────────────────────────────────────────────

  describe('POST /api/agents/:id/run', () => {
    it('calls runNow and returns ok', async () => {
      const scheduler = makeMockScheduler()
      const res = await request(createApp(scheduler))
        .post('/api/agents/task-monitor/run')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(scheduler.runNow).toHaveBeenCalledWith('task-monitor')
    })

    it('returns 500 when runNow throws', async () => {
      const scheduler = makeMockScheduler()
      scheduler.runNow.mockRejectedValue(new Error('agent failed'))

      const res = await request(createApp(scheduler))
        .post('/api/agents/task-monitor/run')

      expect(res.status).toBe(500)
    })
  })

  // ── PATCH /api/agents/:id ─────────────────────────────────────────────────

  describe('PATCH /api/agents/:id', () => {
    it('calls setEnabled(true) and returns ok', async () => {
      const scheduler = makeMockScheduler()

      const res = await request(createApp(scheduler))
        .patch('/api/agents/calendar-agent')
        .send({ enabled: true })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(scheduler.setEnabled).toHaveBeenCalledWith('calendar-agent', true)
    })

    it('calls setEnabled(false) and returns ok', async () => {
      const scheduler = makeMockScheduler()

      const res = await request(createApp(scheduler))
        .patch('/api/agents/calendar-agent')
        .send({ enabled: false })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(scheduler.setEnabled).toHaveBeenCalledWith('calendar-agent', false)
    })

    it('does not call setEnabled when enabled is not in body', async () => {
      const scheduler = makeMockScheduler()

      const res = await request(createApp(scheduler))
        .patch('/api/agents/calendar-agent')
        .send({})

      expect(res.status).toBe(200)
      expect(scheduler.setEnabled).not.toHaveBeenCalled()
    })
  })

  // ── POST /api/agents ──────────────────────────────────────────────────────

  describe('POST /api/agents', () => {
    it('creates a new user agent and returns its definition', async () => {
      const def = {
        id: 'my-agent',
        name: 'My Agent',
        description: 'Does stuff',
        intervalMs: 60 * 60_000,
        enabled: true,
        icon: '🤖',
      }

      mockAddUserAgent.mockReturnValue(def)
      mockBuildDynamicAgent.mockReturnValue({ id: 'my-agent', run: vi.fn() })

      const scheduler = makeMockScheduler()
      const res = await request(createApp(scheduler))
        .post('/api/agents')
        .send({ name: 'My Agent', description: 'Does stuff' })

      expect(res.status).toBe(200)
      expect(res.body.id).toBe('my-agent')
      expect(res.body.name).toBe('My Agent')
    })

    it('returns 400 when name is missing', async () => {
      const res = await request(createApp())
        .post('/api/agents')
        .send({ description: 'Does stuff' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/name and description/i)
    })

    it('returns 400 when description is missing', async () => {
      const res = await request(createApp())
        .post('/api/agents')
        .send({ name: 'My Agent' })

      expect(res.status).toBe(400)
    })

    it('slugifies the name to form the id', async () => {
      const def = { id: 'my-cool-agent', name: 'My Cool Agent', description: 'Test', intervalMs: 3600000, enabled: true, icon: '🤖' }
      mockAddUserAgent.mockReturnValue(def)
      mockBuildDynamicAgent.mockReturnValue({ id: 'my-cool-agent', run: vi.fn() })

      const scheduler = makeMockScheduler()
      await request(createApp(scheduler))
        .post('/api/agents')
        .send({ name: 'My Cool Agent', description: 'Test' })

      expect(mockAddUserAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-cool-agent' }),
      )
    })
  })

  // ── DELETE /api/agents/:id ────────────────────────────────────────────────

  describe('DELETE /api/agents/:id', () => {
    it('removes an agent and returns ok', async () => {
      mockRemoveUserAgent.mockImplementation(() => {}) // no throw

      const res = await request(createApp()).delete('/api/agents/my-agent')

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockRemoveUserAgent).toHaveBeenCalledWith('my-agent')
    })

    it('returns 404 when agent does not exist', async () => {
      mockRemoveUserAgent.mockImplementation(() => {
        throw new Error('Agent not found')
      })

      const res = await request(createApp()).delete('/api/agents/ghost-agent')

      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/agent not found/i)
    })
  })
})
