import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = 'test-user-id'; next() }
}))

import { deepgramRouter } from './deepgram.js'
import { requireAuth } from '../middleware/auth.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use(requireAuth)
  app.use('/api', deepgramRouter())
  app.use(errorMiddleware)
  return app
}

describe('deepgram router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY
  })

  describe('GET /api/deepgram/token', () => {
    it('returns the Deepgram API key when set', async () => {
      process.env.DEEPGRAM_API_KEY = 'dg-test-key-12345'
      const res = await request(createApp()).get('/api/deepgram/token')
      expect(res.status).toBe(200)
      expect(res.body.key).toBe('dg-test-key-12345')
    })

    it('returns 503 when DEEPGRAM_API_KEY is not set', async () => {
      delete process.env.DEEPGRAM_API_KEY
      const res = await request(createApp()).get('/api/deepgram/token')
      expect(res.status).toBe(503)
      expect(res.body.error).toMatch(/DEEPGRAM_API_KEY not set/i)
      expect(res.body.code).toBe('MISSING_CONFIG')
    })

    it('returns 503 when DEEPGRAM_API_KEY is empty string', async () => {
      process.env.DEEPGRAM_API_KEY = ''
      const res = await request(createApp()).get('/api/deepgram/token')
      expect(res.status).toBe(503)
    })
  })
})
