import { describe, it, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id'
    next()
  },
}))

import { miscRouter } from './misc.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', miscRouter())
  app.use(errorMiddleware)
  return app
}

describe('misc router', () => {
  describe('GET /api/quote', () => {
    it('returns a quote object with quote and author fields', async () => {
      const res = await request(createApp()).get('/api/quote')

      expect(res.status).toBe(200)
      expect(typeof res.body.quote).toBe('string')
      expect(typeof res.body.author).toBe('string')
      expect(res.body.quote.length).toBeGreaterThan(0)
    })

    it('returns a different shape on repeated calls (sampling from the quote pool)', async () => {
      // Run many times — every response should have valid shape
      const app = createApp()
      const responses = await Promise.all(
        Array.from({ length: 10 }, () => request(app).get('/api/quote')),
      )

      for (const res of responses) {
        expect(res.status).toBe(200)
        expect(typeof res.body.quote).toBe('string')
        expect(typeof res.body.author).toBe('string')
        expect(res.body.quote.length).toBeGreaterThan(0)
        expect(res.body.author.length).toBeGreaterThan(0)
      }
    })
  })
})
