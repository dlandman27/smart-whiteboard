import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

import { youtubeRouter } from './youtube.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', youtubeRouter())
  app.use(errorMiddleware)
  return app
}

describe('youtube router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    process.env.YOUTUBE_API_KEY = 'test-yt-api-key'
  })

  afterEach(() => {
    delete process.env.YOUTUBE_API_KEY
  })

  describe('GET /api/youtube/search', () => {
    it('returns videoId and title for a valid query', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          items: [
            {
              id: { videoId: 'dQw4w9WgXcQ' },
              snippet: { title: 'Rick Astley - Never Gonna Give You Up' },
            },
          ],
        }),
      } as any)

      const res = await request(createApp()).get('/api/youtube/search?q=rick+astley')
      expect(res.status).toBe(200)
      expect(res.body.videoId).toBe('dQw4w9WgXcQ')
      expect(res.body.title).toBe('Rick Astley - Never Gonna Give You Up')
    })

    it('returns videoId:null when no results found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ items: [] }),
      } as any)

      const res = await request(createApp()).get('/api/youtube/search?q=nonexistent+video+xyzzy')
      expect(res.status).toBe(200)
      expect(res.body.videoId).toBeNull()
    })

    it('returns videoId:null when items is undefined', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({}),
      } as any)

      const res = await request(createApp()).get('/api/youtube/search?q=something')
      expect(res.status).toBe(200)
      expect(res.body.videoId).toBeNull()
    })

    it('returns 400 when query param is missing', async () => {
      const res = await request(createApp()).get('/api/youtube/search')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/missing q param/i)
    })

    it('returns 503 when YOUTUBE_API_KEY is not set', async () => {
      delete process.env.YOUTUBE_API_KEY
      const res = await request(createApp()).get('/api/youtube/search?q=test')
      expect(res.status).toBe(503)
      expect(res.body.code).toBe('MISSING_CONFIG')
    })

    it('passes the API key in the request URL', async () => {
      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ items: [] }),
      } as any)

      await request(createApp()).get('/api/youtube/search?q=test')
      const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(fetchUrl).toContain('key=test-yt-api-key')
      expect(fetchUrl).toContain('q=test')
    })

    it('handles fetch errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network failure'))

      const res = await request(createApp()).get('/api/youtube/search?q=test')
      expect(res.status).toBe(500)
    })
  })
})
