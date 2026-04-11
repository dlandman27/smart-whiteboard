import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock supabaseAdmin
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

const mockGetUser = supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>

function createApp() {
  const app = express()
  app.use(express.json())
  const api = express.Router()
  api.use(requireAuth)
  api.get('/test', (req, res) => res.json({ userId: req.userId }))
  api.get('/health', (_req, res) => res.json({ ok: true }))
  api.get('/gcal/callback', (_req, res) => res.send('ok'))
  api.get('/spotify/callback', (_req, res) => res.send('ok'))
  app.use('/api', api)
  return app
}

describe('Auth pipeline integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects requests without JWT with 401', async () => {
    const res = await request(createApp()).get('/api/test')
    expect(res.status).toBe(401)
    expect(res.body.error).toBeDefined()
  })

  it('accepts requests with valid JWT', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc' } },
      error: null,
    })

    const res = await request(createApp())
      .get('/api/test')
      .set('Authorization', 'Bearer valid-jwt')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('user-abc')
  })

  it('allows OAuth callback routes without JWT', async () => {
    const app = createApp()

    const health = await request(app).get('/api/health')
    expect(health.status).toBe(200)

    const gcal = await request(app).get('/api/gcal/callback')
    expect(gcal.status).toBe(200)

    const spotify = await request(app).get('/api/spotify/callback')
    expect(spotify.status).toBe(200)

    // None should have called getUser
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})
