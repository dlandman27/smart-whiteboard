import { Router } from 'express'
import { broadcast } from '../ws.js'
import { asyncRoute, AppError } from '../middleware/error.js'
import db from '../services/db.js'
import {
  getWalliProfile, upsertWalliProfile,
  logObservation, buildWalliContext,
} from '../services/walli-context.js'

interface AgentWidgetState {
  widget_id:  string
  agent:      string
  data:       Record<string, unknown>
  size:       string
  updated_at: string
}

interface LayoutDecision {
  widget_id: string
  action:    string
  size?:     string
  reason?:   string
}

function loadWidgets(): AgentWidgetState[] {
  return (db.prepare('SELECT widget_id, agent_id AS agent, data, size, updated_at FROM walli_widgets ORDER BY updated_at DESC').all() as any[])
    .map((r) => ({ ...r, data: JSON.parse(r.data) }))
}

function saveWidget(state: AgentWidgetState): void {
  db.prepare(`INSERT OR REPLACE INTO walli_widgets (widget_id, agent_id, data, size, updated_at)
              VALUES (?, ?, ?, ?, ?)`)
    .run(state.widget_id, state.agent, JSON.stringify(state.data), state.size, state.updated_at)
}

export function walliRouter(): Router {
  const router = Router()

  router.post('/walli/widget', asyncRoute(async (req, res) => {
    const { agent, widget_id, data, size, updated_at } = req.body as AgentWidgetState

    if (!agent || !widget_id) {
      return res.status(400).json({ error: 'agent and widget_id are required' })
    }

    const state: AgentWidgetState = {
      agent,
      widget_id,
      data:       data       ?? {},
      size:       size       ?? 'medium',
      updated_at: updated_at ?? new Date().toISOString(),
    }

    saveWidget(state)
    broadcast({ type: 'walli_widget_update', ...state })

    return res.json({ ok: true, widget_id })
  }))

  router.post('/walli/layout', asyncRoute(async (req, res) => {
    const { widget_id, action, size, reason } = req.body as LayoutDecision

    if (!widget_id || !action) {
      return res.status(400).json({ error: 'widget_id and action are required' })
    }

    broadcast({ type: 'walli_layout_update', widget_id, action, size, reason })

    return res.json({ ok: true })
  }))

  router.get('/walli/widgets', (_req, res) => {
    res.json(loadWidgets())
  })

  // ── Profile ───────────────────────────────────────────────────────────────

  router.get('/walli/profile', asyncRoute(async (req, res) => {
    const profile = await getWalliProfile(req.userId!)
    res.json(profile ?? {})
  }))

  router.patch('/walli/profile', asyncRoute(async (req, res) => {
    const allowed = [
      'preferred_name', 'life_focus', 'tendencies', 'motivation_style',
      'about', 'coaching_style', 'checkin_frequency',
      'synthesized_context', 'context_updated_at',
      'onboarding_completed', 'onboarding_completed_at',
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key]
    }
    if (Object.keys(patch).length === 0) throw new AppError(400, 'No valid fields to update')
    const profile = await upsertWalliProfile(req.userId!, patch)
    res.json(profile)
  }))

  // ── Observations ──────────────────────────────────────────────────────────

  router.post('/walli/observations', asyncRoute(async (req, res) => {
    const { type, content, source, confidence = 0.5 } = req.body
    if (!type || !content || !source) throw new AppError(400, 'type, content, and source are required')
    await logObservation(req.userId!, { type, content, source, confidence })
    res.json({ ok: true })
  }))

  // ── Context ───────────────────────────────────────────────────────────────
  // Returns the full assembled context document Walli reads before interacting.

  router.get('/walli/context', asyncRoute(async (req, res) => {
    const context = await buildWalliContext(req.userId!)
    res.json({ context })
  }))

  return router
}
