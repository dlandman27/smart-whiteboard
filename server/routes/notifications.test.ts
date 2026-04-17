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

// ── Hoist mocked values so they can be used inside vi.mock factories ──────────

const { mockNotifLog, mockActiveTimers, mockLoadReminders } = vi.hoisted(() => {
  const notifLog: any[] = [
    { id: 'n1', title: 'Timer done', body: 'Your timer fired', ts: 1000 },
  ]
  const activeTimers = new Map<string, any>([
    [
      't1',
      {
        id:         't1',
        label:      'Pomodoro',
        durationMs: 25 * 60_000,
        startedAt:  Date.now() - 5 * 60_000,
        fired:      false,
      },
    ],
    [
      't2',
      {
        id:         't2',
        label:      'Finished',
        durationMs: 1000,
        startedAt:  Date.now() - 2000,
        fired:      true, // should be filtered out
      },
    ],
  ])
  return {
    mockNotifLog:     notifLog,
    mockActiveTimers: activeTimers,
    mockLoadReminders: vi.fn(),
  }
})

vi.mock('../services/notify.js', () => ({
  notifLog: mockNotifLog,
}))

vi.mock('../services/timers.js', () => ({
  activeTimers: mockActiveTimers,
}))

vi.mock('../services/reminders.js', () => ({
  loadReminders: (...args: any[]) => mockLoadReminders(...args),
}))

import { notificationsRouter } from './notifications.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', notificationsRouter())
  app.use(errorMiddleware)
  return app
}

describe('notifications router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadReminders.mockReturnValue([
      { id: 'r1', text: 'Team standup', fireAt: '2026-04-17T09:00:00Z', fired: false },
      { id: 'r2', text: 'Old reminder', fireAt: '2026-01-01T00:00:00Z', fired: true },
    ])
  })

  // ── GET /api/notifications ───────────────────────────────────────────────

  describe('GET /api/notifications', () => {
    it('returns the notification log array', async () => {
      const res = await request(createApp()).get('/api/notifications')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0].id).toBe('n1')
      expect(res.body[0].title).toBe('Timer done')
    })
  })

  // ── GET /api/timers ───────────────────────────────────────────────────────

  describe('GET /api/timers', () => {
    it('returns only non-fired timers', async () => {
      const res = await request(createApp()).get('/api/timers')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      // t2 is fired so it should not appear
      expect(res.body.every((t: any) => t.fired === undefined || t.fired === false)).toBe(true)
      // fired field is stripped in the route, check by count
      expect(res.body.some((t: any) => t.id === 't2')).toBe(false)
    })

    it('includes id, label, durationMs, startedAt, remainingMs fields', async () => {
      const res = await request(createApp()).get('/api/timers')

      expect(res.status).toBe(200)
      const timer = res.body.find((t: any) => t.id === 't1')
      expect(timer).toBeDefined()
      expect(timer).toHaveProperty('id')
      expect(timer).toHaveProperty('label')
      expect(timer).toHaveProperty('durationMs')
      expect(timer).toHaveProperty('startedAt')
      expect(timer).toHaveProperty('remainingMs')
    })

    it('remainingMs is 0 for overdue (not-yet-fired) timers', async () => {
      mockActiveTimers.set('t3', {
        id:         't3',
        label:      'Overdue',
        durationMs: 1000,
        startedAt:  Date.now() - 99999,
        fired:      false,
      })

      const res = await request(createApp()).get('/api/timers')

      expect(res.status).toBe(200)
      const overdue = res.body.find((t: any) => t.id === 't3')
      expect(overdue.remainingMs).toBe(0)

      mockActiveTimers.delete('t3')
    })
  })

  // ── GET /api/reminders ────────────────────────────────────────────────────

  describe('GET /api/reminders', () => {
    it('returns only non-fired reminders', async () => {
      const res = await request(createApp()).get('/api/reminders')

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.every((r: any) => r.fired === false)).toBe(true)
      expect(res.body.length).toBe(1)
      expect(res.body[0].id).toBe('r1')
    })

    it('returns empty array when all reminders are fired', async () => {
      mockLoadReminders.mockReturnValue([
        { id: 'r1', text: 'Old', fireAt: '2025-01-01T00:00:00Z', fired: true },
      ])

      const res = await request(createApp()).get('/api/reminders')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })
})
