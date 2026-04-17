import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

vi.mock('../services/credentials.js', () => ({
  loadCredential: vi.fn(),
  saveCredential: vi.fn(),
  deleteCredential: vi.fn(),
}))

import { credentialsRouter } from './credentials.js'
import * as credService from '../services/credentials.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', credentialsRouter())
  app.use(errorMiddleware)
  return app
}

describe('credentials router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Service param validation ──────────────────────────────────────────────────

  describe('service param validation', () => {
    it('returns 400 for unknown service', async () => {
      const res = await request(createApp()).get('/api/credentials/github')
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/unknown service/i)
    })

    it('accepts notion service', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/credentials/notion')
      expect(res.status).toBe(200)
    })

    it('accepts gcal service', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/credentials/gcal')
      expect(res.status).toBe(200)
    })

    it('accepts spotify service', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/credentials/spotify')
      expect(res.status).toBe(200)
    })

    it('accepts todoist service', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/credentials/todoist')
      expect(res.status).toBe(200)
    })
  })

  // ── GET /credentials/:service ────────────────────────────────────────────────

  describe('GET /api/credentials/:service', () => {
    it('returns configured:true when credential exists', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue({ api_key: 'some-key' })
      const res = await request(createApp()).get('/api/credentials/notion')
      expect(res.status).toBe(200)
      expect(res.body.configured).toBe(true)
    })

    it('returns configured:false when no credential', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      const res = await request(createApp()).get('/api/credentials/notion')
      expect(res.status).toBe(200)
      expect(res.body.configured).toBe(false)
    })

    it('calls loadCredential with userId and service', async () => {
      vi.mocked(credService.loadCredential).mockResolvedValue(null)
      await request(createApp()).get('/api/credentials/spotify')
      expect(credService.loadCredential).toHaveBeenCalledWith('test-user-id', 'spotify')
    })
  })

  // ── POST /credentials/:service ───────────────────────────────────────────────

  describe('POST /api/credentials/:service', () => {
    it('saves credential and returns ok:true', async () => {
      vi.mocked(credService.saveCredential).mockResolvedValue(undefined)
      const res = await request(createApp())
        .post('/api/credentials/notion')
        .send({ api_key: 'secret-123' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(credService.saveCredential).toHaveBeenCalledWith(
        'test-user-id', 'notion', { api_key: 'secret-123' }
      )
    })

    it('returns 400 for unknown service', async () => {
      const res = await request(createApp())
        .post('/api/credentials/twitter')
        .send({ api_key: 'key' })
      expect(res.status).toBe(400)
    })

    it('saves spotify credentials with client_id and client_secret', async () => {
      vi.mocked(credService.saveCredential).mockResolvedValue(undefined)
      const res = await request(createApp())
        .post('/api/credentials/spotify')
        .send({ client_id: 'cid', client_secret: 'csec', redirect_uri: 'http://localhost' })
      expect(res.status).toBe(200)
      expect(credService.saveCredential).toHaveBeenCalledWith(
        'test-user-id', 'spotify',
        { client_id: 'cid', client_secret: 'csec', redirect_uri: 'http://localhost' }
      )
    })
  })

  // ── DELETE /credentials/:service ─────────────────────────────────────────────

  describe('DELETE /api/credentials/:service', () => {
    it('deletes credential and returns ok:true', async () => {
      vi.mocked(credService.deleteCredential).mockResolvedValue(undefined)
      const res = await request(createApp()).delete('/api/credentials/notion')
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(credService.deleteCredential).toHaveBeenCalledWith('test-user-id', 'notion')
    })

    it('returns 400 for unknown service', async () => {
      const res = await request(createApp()).delete('/api/credentials/slack')
      expect(res.status).toBe(400)
    })

    it('calls deleteCredential with correct args for gcal', async () => {
      vi.mocked(credService.deleteCredential).mockResolvedValue(undefined)
      await request(createApp()).delete('/api/credentials/gcal')
      expect(credService.deleteCredential).toHaveBeenCalledWith('test-user-id', 'gcal')
    })
  })
})
