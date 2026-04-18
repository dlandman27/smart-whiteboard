import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { randomUUID } from 'crypto'

export type GoalType = 'numeric' | 'boolean' | 'habit'
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id:            string
  title:         string
  description:   string | null
  type:          GoalType
  status:        GoalStatus
  emoji:         string
  color:         string
  target_value:  number | null
  current_value: number
  target_date:   string | null
  created_at:    string
  updated_at:    string
}

export interface GoalMilestone {
  id:           string
  goal_id:      string
  title:        string
  completed:    boolean
  sort_order:   number
  created_at:   string
}

export interface GoalProgressEntry {
  id:         string
  goal_id:    string
  value:      number
  note:       string | null
  logged_at:  string
}

export function goalsRouter(): Router {
  const router = Router()

  // ── List goals ─────────────────────────────────────────────────────────────

  router.get('/goals', asyncRoute(async (req, res) => {
    const status = (req.query.status as string) ?? 'active'
    const { data, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    if (error) throw new AppError(500, error.message)
    res.json(data)
  }))

  // ── Get single goal with milestones ────────────────────────────────────────

  router.get('/goals/:id', asyncRoute(async (req, res) => {
    const [{ data: goal, error: gErr }, { data: milestones, error: mErr }] = await Promise.all([
      supabaseAdmin.from('goals').select('*').eq('id', req.params.id).single(),
      supabaseAdmin.from('goal_milestones').select('*').eq('goal_id', req.params.id).order('sort_order'),
    ])
    if (gErr) throw new AppError(gErr.code === 'PGRST116' ? 404 : 500, gErr.message)
    if (mErr) throw new AppError(500, mErr.message)
    res.json({ ...goal, milestones: milestones ?? [] })
  }))

  // ── Create goal ────────────────────────────────────────────────────────────

  router.post('/goals', asyncRoute(async (req, res) => {
    const {
      title, description = null, type = 'boolean', emoji = '🎯',
      color = '#3b82f6', target_value = null, target_date = null,
    } = req.body as Partial<Goal>

    if (!title?.trim()) throw new AppError(400, 'title is required')
    if (!['numeric', 'boolean', 'habit'].includes(type!))
      throw new AppError(400, 'type must be numeric, boolean, or habit')

    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        id: randomUUID(), title: title.trim(), description,
        type, status: 'active', emoji, color,
        target_value, current_value: 0, target_date,
        created_at: now, updated_at: now,
      })
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  }))

  // ── Update goal ────────────────────────────────────────────────────────────

  router.patch('/goals/:id', asyncRoute(async (req, res) => {
    const {
      title, description, type, status, emoji,
      color, target_value, current_value, target_date,
    } = req.body as Partial<Goal>

    if (type && !['numeric', 'boolean', 'habit'].includes(type))
      throw new AppError(400, 'type must be numeric, boolean, or habit')
    if (status && !['active', 'completed', 'archived'].includes(status))
      throw new AppError(400, 'status must be active, completed, or archived')

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title         !== undefined) updates.title         = title.trim()
    if (description   !== undefined) updates.description   = description
    if (type          !== undefined) updates.type          = type
    if (status        !== undefined) updates.status        = status
    if (emoji         !== undefined) updates.emoji         = emoji
    if (color         !== undefined) updates.color         = color
    if (target_value  !== undefined) updates.target_value  = target_value
    if (current_value !== undefined) updates.current_value = current_value
    if (target_date   !== undefined) updates.target_date   = target_date

    const { data, error } = await supabaseAdmin
      .from('goals')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Goal not found')
    res.json(data)
  }))

  // ── Delete goal ────────────────────────────────────────────────────────────

  router.delete('/goals/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', req.params.id)
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true })
  }))

  // ── Log progress ───────────────────────────────────────────────────────────

  router.post('/goals/:id/progress', asyncRoute(async (req, res) => {
    const { value, note = null } = req.body as { value: number; note?: string | null }
    if (typeof value !== 'number') throw new AppError(400, 'value must be a number')

    const now = new Date().toISOString()
    const { data: entry, error: entryErr } = await supabaseAdmin
      .from('goal_progress')
      .insert({ id: randomUUID(), goal_id: req.params.id, value, note, logged_at: now })
      .select()
      .single()
    if (entryErr) throw new AppError(500, entryErr.message)

    // Update current_value on goal
    const { data: goal, error: goalErr } = await supabaseAdmin
      .from('goals')
      .update({ current_value: value, updated_at: now })
      .eq('id', req.params.id)
      .select()
      .single()
    if (goalErr) throw new AppError(500, goalErr.message)

    res.status(201).json({ entry, goal })
  }))

  // ── Milestones ─────────────────────────────────────────────────────────────

  router.get('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', req.params.id)
      .order('sort_order')
    if (error) throw new AppError(500, error.message)
    res.json(data)
  }))

  router.post('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { title, sort_order = 0 } = req.body as Partial<GoalMilestone>
    if (!title?.trim()) throw new AppError(400, 'title is required')
    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .insert({ id: randomUUID(), goal_id: req.params.id, title: title.trim(), completed: false, sort_order })
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  }))

  router.patch('/goals/:goalId/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { title, completed } = req.body as Partial<GoalMilestone>
    const updates: Record<string, unknown> = {}
    if (title     !== undefined) updates.title     = title.trim()
    if (completed !== undefined) updates.completed = completed
    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .update(updates)
      .eq('id', req.params.milestoneId)
      .eq('goal_id', req.params.goalId)
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Milestone not found')
    res.json(data)
  }))

  router.delete('/goals/:goalId/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goal_milestones')
      .delete()
      .eq('id', req.params.milestoneId)
      .eq('goal_id', req.params.goalId)
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true })
  }))

  return router
}
