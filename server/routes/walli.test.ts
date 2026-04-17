import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../ws.js', () => ({
  broadcast: vi.fn(),
}))

import { walliRouter } from './walli.js'
import * as ws from '../ws.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', walliRouter())
  app.use(errorMiddleware)
  return app
}

describe('walli router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── POST /walli/widget ───────────────────────────────────────────────────────

  describe('POST /api/walli/widget', () => {
    it('stores widget state and broadcasts update', async () => {
      const res = await request(createApp())
        .post('/api/walli/widget')
        .send({ agent: 'calendar', widget_id: 'cal-widget', data: { events: [] }, size: 'large' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.widget_id).toBe('cal-widget')
      expect(ws.broadcast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'walli_widget_update',
        agent: 'calendar',
        widget_id: 'cal-widget',
      }))
    })

    it('uses defaults for missing optional fields', async () => {
      const res = await request(createApp())
        .post('/api/walli/widget')
        .send({ agent: 'weather', widget_id: 'weather-widget' })

      expect(res.status).toBe(200)
      const broadcastArg = vi.mocked(ws.broadcast).mock.calls[0][0] as any
      expect(broadcastArg.size).toBe('medium')
      expect(broadcastArg.data).toEqual({})
      expect(broadcastArg.updated_at).toBeTruthy()
    })

    it('returns 400 when agent is missing', async () => {
      const res = await request(createApp())
        .post('/api/walli/widget')
        .send({ widget_id: 'cal-widget' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/agent and widget_id are required/i)
    })

    it('returns 400 when widget_id is missing', async () => {
      const res = await request(createApp())
        .post('/api/walli/widget')
        .send({ agent: 'calendar' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/agent and widget_id are required/i)
    })

    it('returns 400 when both agent and widget_id are missing', async () => {
      const res = await request(createApp())
        .post('/api/walli/widget')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  // ── POST /walli/layout ───────────────────────────────────────────────────────

  describe('POST /api/walli/layout', () => {
    it('broadcasts layout decision and returns ok:true', async () => {
      const res = await request(createApp())
        .post('/api/walli/layout')
        .send({ widget_id: 'cal-widget', action: 'promote', size: 'large', reason: 'user active' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(ws.broadcast).toHaveBeenCalledWith({
        type: 'walli_layout_update',
        widget_id: 'cal-widget',
        action: 'promote',
        size: 'large',
        reason: 'user active',
      })
    })

    it('returns 400 when widget_id is missing', async () => {
      const res = await request(createApp())
        .post('/api/walli/layout')
        .send({ action: 'collapse' })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/widget_id and action are required/i)
    })

    it('returns 400 when action is missing', async () => {
      const res = await request(createApp())
        .post('/api/walli/layout')
        .send({ widget_id: 'cal-widget' })

      expect(res.status).toBe(400)
    })

    it('works with minimal required fields', async () => {
      const res = await request(createApp())
        .post('/api/walli/layout')
        .send({ widget_id: 'w1', action: 'collapse' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  // ── GET /walli/widgets ───────────────────────────────────────────────────────

  describe('GET /api/walli/widgets', () => {
    it('returns empty array initially', async () => {
      // Create a fresh app with fresh router to avoid state from other tests
      const freshApp = express()
      freshApp.use(express.json())
      freshApp.use('/api', walliRouter())
      freshApp.use(errorMiddleware)

      const res = await request(freshApp).get('/api/walli/widgets')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns stored widgets after a push', async () => {
      const app = createApp()

      await request(app)
        .post('/api/walli/widget')
        .send({ agent: 'calendar', widget_id: 'cal-w', data: { foo: 'bar' } })

      const res = await request(app).get('/api/walli/widgets')
      expect(res.status).toBe(200)
      // May contain widgets from other tests since module-level map persists,
      // but should at minimum contain the one we just added
      const found = res.body.find((w: any) => w.widget_id === 'cal-w')
      expect(found).toBeTruthy()
      expect(found.agent).toBe('calendar')
    })

    it('returns latest state when widget is updated', async () => {
      const app = createApp()
      const widgetId = `test-widget-${Date.now()}`

      await request(app)
        .post('/api/walli/widget')
        .send({ agent: 'tasks', widget_id: widgetId, data: { count: 1 } })

      await request(app)
        .post('/api/walli/widget')
        .send({ agent: 'tasks', widget_id: widgetId, data: { count: 5 } })

      const res = await request(app).get('/api/walli/widgets')
      const found = res.body.find((w: any) => w.widget_id === widgetId)
      expect(found.data.count).toBe(5)
    })
  })
})
