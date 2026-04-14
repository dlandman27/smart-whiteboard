import { Router } from 'express'
import { asyncRoute, AppError } from '../middleware/error.js'

// In-memory store keyed by `${userId}:${date}`.
// Supabase persistence will be added in a future iteration.
const healthStore = new Map<string, any>()

export function healthRouter(): Router {
  const router = Router()

  // POST /api/health-data — receive health snapshot from mobile app
  router.post('/health-data', asyncRoute(async (req, res) => {
    const userId = (req as any).userId as string | undefined
    const body   = req.body as {
      date:      string
      steps?:    number
      calories?: number
      weight?:   number | null
      workouts?: any[]
      sleep?:    number | null
      heartRate?: number | null
    }

    if (!body?.date) throw new AppError(400, 'date is required')

    const key = `${userId ?? 'anon'}:${body.date}`
    healthStore.set(key, {
      ...body,
      userId,
      receivedAt: new Date().toISOString(),
    })

    res.json({ ok: true })
  }))

  // GET /api/health-data?date=YYYY-MM-DD — retrieve health snapshot
  router.get('/health-data', asyncRoute(async (req, res) => {
    const userId = (req as any).userId as string | undefined
    const date   = (req.query.date as string) ?? new Date().toISOString().split('T')[0]
    const key    = `${userId ?? 'anon'}:${date}`
    const data   = healthStore.get(key) ?? null
    res.json({ data })
  }))

  return router
}
