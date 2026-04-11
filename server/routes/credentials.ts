import { Router } from 'express'
import { loadCredential, saveCredential, deleteCredential } from '../services/credentials.js'
import { AppError, asyncRoute } from '../middleware/error.js'

const ALLOWED_SERVICES = new Set(['notion', 'gcal', 'spotify'])

export function credentialsRouter(): Router {
  const router = Router()

  // Validate service name
  router.param('service', (req, res, next, service) => {
    if (!ALLOWED_SERVICES.has(service)) {
      res.status(400).json({ error: `Unknown service: ${service}. Allowed: ${[...ALLOWED_SERVICES].join(', ')}` })
      return
    }
    next()
  })

  router.get('/credentials/:service', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')
    const cred = await loadCredential(userId, req.params.service)
    res.json({ configured: !!cred })
  }))

  router.post('/credentials/:service', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')
    await saveCredential(userId, req.params.service, req.body)
    res.json({ ok: true })
  }))

  router.delete('/credentials/:service', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')
    await deleteCredential(userId, req.params.service)
    res.json({ ok: true })
  }))

  return router
}
