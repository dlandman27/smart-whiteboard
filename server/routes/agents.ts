import { Router } from 'express'
import { createScheduler, addUserAgent, removeUserAgent, updateUserAgent, buildDynamicAgent } from '../agents/index.js'
import type { UserAgentDef } from '../agents/index.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import db from '../services/db.js'

type AgentScheduler = ReturnType<typeof createScheduler>

export function agentsRouter(agentScheduler: AgentScheduler): Router {
  const router = Router()

  router.get('/agents', (_req, res) => {
    res.json(agentScheduler.status())
  })

  router.post('/agents/:id/run', asyncRoute(async (req, res) => {
    await agentScheduler.runNow(req.params.id)
    res.json({ ok: true })
  }))

  router.patch('/agents/:id', (req, res) => {
    const { enabled, triggers } = req.body as { enabled?: boolean; triggers?: any[] }
    if (typeof enabled === 'boolean') agentScheduler.setEnabled(req.params.id, enabled)
    try { updateUserAgent(req.params.id, { ...(typeof enabled === 'boolean' ? { enabled } : {}), ...(triggers ? { triggers } : {}) }) } catch { /* built-in agent */ }
    res.json({ ok: true })
  })

  router.post('/agents', asyncRoute(async (req, res) => {
    const { name, description, intervalMs, icon, spriteType, triggers } = req.body as Partial<UserAgentDef>
    if (!name || !description) throw new AppError(400, 'name and description are required')
    const id  = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const def = addUserAgent({
      id,
      name,
      description,
      intervalMs:  intervalMs ?? 60 * 60_000,
      enabled:     true,
      icon:        icon ?? '🤖',
      spriteType,
      triggers:    triggers ?? [],
    })
    agentScheduler.register(buildDynamicAgent(def))
    res.json(def)
  }))

  router.get('/agents/:id/runs', (_req, res) => {
    const runs = db.prepare(
      `SELECT id, agent_id, started_at, duration_ms, output, error
       FROM agent_runs WHERE agent_id = ? ORDER BY id DESC LIMIT 20`
    ).all(_req.params.id)
    res.json(runs)
  })

  router.delete('/agents/:id', asyncRoute(async (req, res) => {
    try {
      removeUserAgent(req.params.id)
      res.json({ ok: true })
    } catch (err: any) {
      throw new AppError(404, err.message)
    }
  }))

  return router
}
