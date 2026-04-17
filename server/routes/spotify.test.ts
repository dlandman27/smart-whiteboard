import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../services/credentials.js', () => ({
  saveOAuthTokens: vi.fn(),
  saveCredential: vi.fn(),
}))

vi.mock('../services/spotify.js', () => ({
  SPOTIFY_SCOPES: 'user-read-currently-playing user-read-playback-state user-modify-playback-state',
  getSpotifyAccessToken: vi.fn(),
  spotifyControl: vi.fn(),
  pendingSpotifyAuths: new Map(),
}))

import { spotifyRouter } from './spotify.js'
import * as spotifyService from '../services/spotify.js'
import * as credentials from '../services/credentials.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', spotifyRouter())
  app.use(errorMiddleware)
  return app
}

describe('spotify router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    // Clear pending auths map
    spotifyService.pendingSpotifyAuths.clear()
  })

  // ── Status ──────────────────────────────────────────────────────────────────

  describe('GET /api/spotify/status', () => {
    it('returns connected:true when token exists', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue('access-token')
      const res = await request(createApp()).get('/api/spotify/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(true)
    })

    it('returns connected:false when no token', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/spotify/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
    })
  })

  // ── Start auth ───────────────────────────────────────────────────────────────

  describe('POST /api/spotify/start-auth', () => {
    it('returns authorization URL with required fields', async () => {
      vi.mocked(credentials.saveCredential).mockResolvedValue(undefined)
      const res = await request(createApp())
        .post('/api/spotify/start-auth')
        .send({ clientId: 'cid', clientSecret: 'csec', redirectUri: 'http://localhost/callback' })

      expect(res.status).toBe(200)
      expect(res.body.url).toContain('accounts.spotify.com/authorize')
      expect(res.body.url).toContain('client_id=cid')
    })

    it('returns 400 when clientId is missing', async () => {
      const res = await request(createApp())
        .post('/api/spotify/start-auth')
        .send({ clientSecret: 'csec', redirectUri: 'http://localhost/callback' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/clientId.*required/i)
    })

    it('returns 400 when clientSecret is missing', async () => {
      const res = await request(createApp())
        .post('/api/spotify/start-auth')
        .send({ clientId: 'cid', redirectUri: 'http://localhost/callback' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when redirectUri is missing', async () => {
      const res = await request(createApp())
        .post('/api/spotify/start-auth')
        .send({ clientId: 'cid', clientSecret: 'csec' })
      expect(res.status).toBe(400)
    })
  })

  // ── Callback ─────────────────────────────────────────────────────────────────

  describe('GET /api/spotify/callback', () => {
    it('returns 400 when no pending auth state', async () => {
      const res = await request(createApp()).get('/api/spotify/callback?code=abc&state=bad-state')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/no pending/i)
    })

    it('returns HTML success page after token exchange', async () => {
      spotifyService.pendingSpotifyAuths.set('valid-state', {
        userId: 'test-user-id',
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'http://localhost/callback',
      })
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      } as any)
      vi.mocked(credentials.saveOAuthTokens).mockResolvedValue(undefined)

      const res = await request(createApp()).get('/api/spotify/callback?code=auth-code&state=valid-state')
      expect(res.status).toBe(200)
      expect(res.text).toContain('Spotify connected')
    })

    it('returns 400 when token exchange fails', async () => {
      spotifyService.pendingSpotifyAuths.set('valid-state', {
        userId: 'test-user-id',
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'http://localhost/callback',
      })
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ error: 'invalid_grant' }),
      } as any)

      const res = await request(createApp()).get('/api/spotify/callback?code=bad-code&state=valid-state')
      expect(res.status).toBe(400)
    })
  })

  // ── Now playing ──────────────────────────────────────────────────────────────

  describe('GET /api/spotify/now-playing', () => {
    it('returns now-playing data', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue('access-token')
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          is_playing: true,
          progress_ms: 30000,
          item: {
            name: 'Song Title',
            duration_ms: 200000,
            artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
            album: { name: 'Album Name', images: [{ url: 'https://art.example.com/cover.jpg' }] },
            external_urls: { spotify: 'https://open.spotify.com/track/123' },
          },
        }),
      } as any)

      const res = await request(createApp()).get('/api/spotify/now-playing')
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Song Title')
      expect(res.body.artist).toBe('Artist A, Artist B')
      expect(res.body.isPlaying).toBe(true)
    })

    it('returns null when nothing playing (204)', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue('access-token')
      vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as any)

      const res = await request(createApp()).get('/api/spotify/now-playing')
      expect(res.status).toBe(200)
      expect(res.body).toBeNull()
    })

    it('returns null when item is absent', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue('access-token')
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ is_playing: false }),
      } as any)

      const res = await request(createApp()).get('/api/spotify/now-playing')
      expect(res.status).toBe(200)
      expect(res.body).toBeNull()
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/spotify/now-playing')
      expect(res.status).toBe(401)
    })

    it('returns error when Spotify API fails', async () => {
      vi.mocked(spotifyService.getSpotifyAccessToken).mockResolvedValue('access-token')
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as any)

      const res = await request(createApp()).get('/api/spotify/now-playing')
      expect(res.status).toBe(500)
    })
  })

  // ── Playback controls ─────────────────────────────────────────────────────────

  describe('POST /api/spotify/play', () => {
    it('returns ok:true on success', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      const res = await request(createApp()).post('/api/spotify/play')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    it('returns 400 on failure', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: false, error: 'Device not found' })
      const res = await request(createApp()).post('/api/spotify/play')
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/spotify/pause', () => {
    it('returns ok:true on success', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      const res = await request(createApp()).post('/api/spotify/pause')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('POST /api/spotify/next', () => {
    it('returns ok:true on success', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      const res = await request(createApp()).post('/api/spotify/next')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('POST /api/spotify/previous', () => {
    it('returns ok:true on success', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      const res = await request(createApp()).post('/api/spotify/previous')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  describe('POST /api/spotify/volume', () => {
    it('sets volume and returns ok:true', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      const res = await request(createApp()).post('/api/spotify/volume').send({ volume: 75 })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(spotifyService.spotifyControl).toHaveBeenCalledWith(
        'test-user-id', 'PUT', '/volume?volume_percent=75'
      )
    })

    it('clamps volume to 0–100', async () => {
      vi.mocked(spotifyService.spotifyControl).mockResolvedValue({ ok: true })
      await request(createApp()).post('/api/spotify/volume').send({ volume: 150 })
      expect(spotifyService.spotifyControl).toHaveBeenCalledWith(
        'test-user-id', 'PUT', '/volume?volume_percent=100'
      )
    })
  })
})
