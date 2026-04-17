import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'

export function deepgramRouter(): Router {
  const router = Router()

  // Returns the Deepgram API key to authenticated users so the browser can
  // open a WebSocket directly to Deepgram without proxying audio through our server.
  router.get('/deepgram/token', asyncRoute(async (_req, res) => {
    const key = process.env.DEEPGRAM_API_KEY
    if (!key) throw new AppError(503, 'DEEPGRAM_API_KEY not set', 'MISSING_CONFIG')
    res.json({ key })
  }))

  return router
}
