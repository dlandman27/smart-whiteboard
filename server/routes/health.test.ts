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

// health.ts uses an in-memory store — no supabase mock needed

import { healthRouter } from './health.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', healthRouter())
  app.use(errorMiddleware)
  return app
}

describe('health router', () => {
  beforeEach(() => {
    // nothing to reset — each test uses its own POST to seed data
  })

  describe('POST /api/health-data', () => {
    it('returns ok:true when date is provided', async () => {
      const res = await request(createApp())
        .post('/api/health-data')
        .send({ date: '2026-04-17', steps: 8000 })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('returns 400 when date is missing', async () => {
      const res = await request(createApp())
        .post('/api/health-data')
        .send({ steps: 5000 })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/date is required/i)
    })

    it('stores all optional health fields', async () => {
      const payload = {
        date: '2026-04-17',
        steps: 10000,
        calories: 2200,
        weight: 180,
        workouts: [{ type: 'run', duration: 30 }],
        sleep: 7.5,
        heartRate: 62,
      }

      const res = await request(createApp())
        .post('/api/health-data')
        .send(payload)

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('GET /api/health-data', () => {
    it('returns null data when no snapshot exists for date', async () => {
      const res = await request(createApp())
        .get('/api/health-data?date=1999-01-01')

      expect(res.status).toBe(200)
      expect(res.body.data).toBeNull()
    })

    it('returns stored snapshot for the given date', async () => {
      const app = createApp()
      const date = '2026-04-17'

      await request(app)
        .post('/api/health-data')
        .send({ date, steps: 7500 })

      const res = await request(app).get(`/api/health-data?date=${date}`)
      expect(res.status).toBe(200)
      expect(res.body.data).not.toBeNull()
      expect(res.body.data.steps).toBe(7500)
    })

    it('defaults to today when no date query param is provided', async () => {
      const res = await request(createApp()).get('/api/health-data')
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
    })
  })
})
