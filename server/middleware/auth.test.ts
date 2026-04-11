import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock supabaseAdmin before importing auth middleware
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

import { requireAuth } from './auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

const mockGetUser = supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>

function createApp() {
  const app = express()
  const api = express.Router()
  api.use(requireAuth)
  api.get('/test', (req, res) => {
    res.json({ userId: req.userId })
  })
  api.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  api.get('/gcal/callback', (_req, res) => {
    res.json({ ok: true })
  })
  app.use('/api', api)
  return app
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets req.userId and calls next on valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const res = await request(createApp())
      .get('/api/test')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('user-123')
    expect(mockGetUser).toHaveBeenCalledWith('valid-token')
  })

  it('returns 401 when no Authorization header', async () => {
    const res = await request(createApp()).get('/api/test')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Missing/)
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid token' },
    })

    const res = await request(createApp())
      .get('/api/test')
      .set('Authorization', 'Bearer bad-token')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Invalid/)
  })

  it('returns 401 when Bearer prefix is missing', async () => {
    const res = await request(createApp())
      .get('/api/test')
      .set('Authorization', 'bad-format')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Missing/)
  })

  it('skips auth for /api/health', async () => {
    const res = await request(createApp()).get('/api/health')

    expect(res.status).toBe(200)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('skips auth for /api/gcal/callback', async () => {
    const res = await request(createApp()).get('/api/gcal/callback')

    expect(res.status).toBe(200)
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})
