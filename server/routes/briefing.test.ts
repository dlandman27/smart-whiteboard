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

// ── Mock briefing service ─────────────────────────────────────────────────────

const { mockCompileBriefing, mockLoadTokens, mockSaveTokens } = vi.hoisted(() => ({
  mockCompileBriefing: vi.fn(),
  mockLoadTokens:      vi.fn(),
  mockSaveTokens:      vi.fn(),
}))

vi.mock('../services/briefing.js', () => ({
  compileBriefing: (...args: any[]) => mockCompileBriefing(...args),
}))

vi.mock('../services/tokens.js', () => ({
  loadTokens: (...args: any[]) => mockLoadTokens(...args),
  saveTokens: (...args: any[]) => mockSaveTokens(...args),
}))

// ── Mock notion.js (getNotionClient) ─────────────────────────────────────────

vi.mock('./notion.js', () => ({
  getNotionClient: vi.fn().mockResolvedValue(null),
}))

// ── Mock @notionhq/client — Client must be a real class (constructable) ───────

vi.mock('@notionhq/client', () => ({
  Client: class MockNotionClient {
    constructor(_opts?: any) {}
  },
}))

import { briefingRouter } from './briefing.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: any, next: any) => {
    req.userId = 'test-user-id'
    next()
  })
  app.use('/api', briefingRouter())
  app.use(errorMiddleware)
  return app
}

describe('briefing router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompileBriefing.mockResolvedValue('Good morning! You have 3 tasks today.')
    mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })
    mockSaveTokens.mockImplementation(() => {})
  })

  // ── GET /api/briefing ─────────────────────────────────────────────────────

  describe('GET /api/briefing', () => {
    it('returns the compiled briefing text', async () => {
      const res = await request(createApp()).get('/api/briefing')

      expect(res.status).toBe(200)
      expect(res.body.text).toBe('Good morning! You have 3 tasks today.')
    })

    it('calls compileBriefing with a Notion client', async () => {
      await request(createApp()).get('/api/briefing')

      expect(mockCompileBriefing).toHaveBeenCalledOnce()
      expect(mockCompileBriefing).toHaveBeenCalledWith(expect.anything())
    })

    it('returns 500 when compileBriefing throws', async () => {
      mockCompileBriefing.mockRejectedValue(new Error('Briefing service failed'))

      const res = await request(createApp()).get('/api/briefing')

      expect(res.status).toBe(500)
    })
  })

  // ── POST /api/briefing/settings ───────────────────────────────────────────

  describe('POST /api/briefing/settings', () => {
    it('saves the briefing time and returns ok', async () => {
      const res = await request(createApp())
        .post('/api/briefing/settings')
        .send({ time: '09:30' })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockSaveTokens).toHaveBeenCalledWith({ briefing_time: '09:30' })
    })

    it('saves empty string when time is omitted', async () => {
      const res = await request(createApp())
        .post('/api/briefing/settings')
        .send({})

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(mockSaveTokens).toHaveBeenCalledWith({ briefing_time: '' })
    })
  })

  // ── GET /api/briefing/settings ────────────────────────────────────────────

  describe('GET /api/briefing/settings', () => {
    it('returns the stored briefing time', async () => {
      mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })

      const res = await request(createApp()).get('/api/briefing/settings')

      expect(res.status).toBe(200)
      expect(res.body.time).toBe('08:00')
    })

    it('returns empty string when no briefing_time is stored', async () => {
      mockLoadTokens.mockReturnValue({})

      const res = await request(createApp()).get('/api/briefing/settings')

      expect(res.status).toBe(200)
      expect(res.body.time).toBe('')
    })

    it('returns empty string when tokens are null', async () => {
      mockLoadTokens.mockReturnValue(null)

      const res = await request(createApp()).get('/api/briefing/settings')

      expect(res.status).toBe(200)
      expect(res.body.time).toBe('')
    })
  })
})
