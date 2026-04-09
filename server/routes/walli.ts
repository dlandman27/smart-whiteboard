import { Router } from 'express'
import { broadcast } from '../ws.js'
import { asyncRoute } from '../middleware/error.js'

// In-memory store of the latest widget push per agent
// { [widget_id]: WidgetState }
const _agentWidgets = new Map<string, AgentWidgetState>()

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

export function walliRouter(): Router {
  const router = Router()

  /**
   * POST /api/walli/widget
   * Called by walli agents via board_client.push_widget().
   * Stores the latest state and broadcasts to all connected browser clients.
   */
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

    _agentWidgets.set(widget_id, state)

    broadcast({ type: 'walli_widget_update', ...state })

    return res.json({ ok: true, widget_id })
  }))

  /**
   * POST /api/walli/layout
   * Called by the Walli orchestrator via board_client.push_layout().
   * Broadcasts a layout decision (promote, collapse, etc.) to the frontend.
   */
  router.post('/walli/layout', asyncRoute(async (req, res) => {
    const { widget_id, action, size, reason } = req.body as LayoutDecision

    if (!widget_id || !action) {
      return res.status(400).json({ error: 'widget_id and action are required' })
    }

    broadcast({ type: 'walli_layout_update', widget_id, action, size, reason })

    return res.json({ ok: true })
  }))

  /**
   * GET /api/walli/widgets
   * Returns the current state of all agent-pushed widgets.
   * Used by the frontend on initial load to hydrate agent widget slots.
   */
  router.get('/walli/widgets', (_req, res) => {
    res.json(Array.from(_agentWidgets.values()))
  })

  return router
}
