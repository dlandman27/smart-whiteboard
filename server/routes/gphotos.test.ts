import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../services/gcal.js', () => ({
  getGCalClient: vi.fn(),
}))

import { gphotosRouter } from './gphotos.js'
import * as gcalService from '../services/gcal.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', gphotosRouter())
  app.use(errorMiddleware)
  return app
}

const mockGetAccessToken = vi.fn()

// Helper to create a mock client
function makeMockClient(token: string | null = 'mock-token') {
  return { getAccessToken: vi.fn().mockResolvedValue({ token }) }
}

describe('gphotos router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  // ── Status ──────────────────────────────────────────────────────────────────

  describe('GET /api/gphotos/status', () => {
    it('returns connected:true when gcal client exists', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue({ getAccessToken: vi.fn() } as any)
      const res = await request(createApp()).get('/api/gphotos/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(true)
    })

    it('returns connected:false when no gcal client', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/gphotos/status')
      expect(res.status).toBe(200)
      expect(res.body.connected).toBe(false)
    })
  })

  // ── Albums ──────────────────────────────────────────────────────────────────

  describe('GET /api/gphotos/albums', () => {
    it('returns albums list', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient('tok123') as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ albums: [{ id: 'album1', title: 'Vacation' }] }),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/albums')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe('album1')
    })

    it('returns empty array when no albums', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/albums')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns 401 when google account not connected', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/gphotos/albums')
      expect(res.status).toBe(401)
    })

    it('returns 401 when access token is null', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient(null) as any)
      const res = await request(createApp()).get('/api/gphotos/albums')
      expect(res.status).toBe(401)
    })

    it('propagates Google Photos API errors', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as any)

      const res = await request(createApp()).get('/api/gphotos/albums')
      expect(res.status).toBe(403)
    })
  })

  // ── Photos ──────────────────────────────────────────────────────────────────

  describe('GET /api/gphotos/photos', () => {
    const imageItem = {
      id: 'photo1',
      baseUrl: 'https://lh3.google.com/photo',
      mimeType: 'image/jpeg',
      mediaMetadata: { width: '800', height: '600', creationTime: '2026-01-01T00:00:00Z' },
      description: 'Nice photo',
    }

    it('returns recent photos when no albumId', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ mediaItems: [imageItem], nextPageToken: 'page2' }),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/photos')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].id).toBe('photo1')
      expect(res.body.nextPageToken).toBe('page2')
    })

    it('filters out non-image items', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          mediaItems: [
            imageItem,
            { ...imageItem, id: 'video1', mimeType: 'video/mp4' },
          ],
        }),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/photos')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
    })

    it('searches within album when albumId provided', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ mediaItems: [imageItem] }),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/photos?albumId=album123')
      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(1)
      // Should have used POST to mediaItems:search
      const fetchCall = vi.mocked(fetch).mock.calls[0]
      expect(fetchCall[0]).toContain('mediaItems:search')
      expect((fetchCall[1] as RequestInit).method).toBe('POST')
    })

    it('returns 401 when not connected', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/gphotos/photos')
      expect(res.status).toBe(401)
    })

    it('handles Google Photos API error on photos endpoint', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any)

      const res = await request(createApp()).get('/api/gphotos/photos')
      expect(res.status).toBe(500)
    })

    it('returns null nextPageToken when not present', async () => {
      vi.mocked(gcalService.getGCalClient).mockResolvedValue(makeMockClient() as any)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ mediaItems: [] }),
      } as any)

      const res = await request(createApp()).get('/api/gphotos/photos')
      expect(res.status).toBe(200)
      expect(res.body.nextPageToken).toBeNull()
    })
  })
})
