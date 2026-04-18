import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import type {
  Goal,
  GoalMilestone,
  GoalProgressLog,
  GoalLink,
  GoalType,
  GoalStatus,
  LinkType,
} from '../types/goals.js'

const VALID_TYPES:    GoalType[]   = ['numeric', 'habit', 'time_based', 'milestone']
const VALID_STATUSES: GoalStatus[] = ['active', 'completed', 'archived']
const VALID_LINK_TYPES: LinkType[] = ['routine', 'task_list']

export function goalsRouter(): Router {
  const router = Router()

  // ── List goals (with milestones and links) ────────────────────────────────

  router.get('/goals', asyncRoute(async (req, res) => {
    const { status, type } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('goals')
      .select('*, milestones:goal_milestones(*), links:goal_links(*)')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (type)   query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch goals: ${error.message}`)

    res.json(data)
  }))

  // ── Create goal ───────────────────────────────────────────────────────────

  router.post('/goals', asyncRoute(async (req, res) => {
    const {
      title,
      description,
      type,
      target_value,
      unit,
      start_date,
      target_date,
      color,
      emoji,
    } = req.body as Partial<Goal>

    if (!title?.trim())         throw new AppError(400, 'title is required')
    if (!type)                  throw new AppError(400, 'type is required')
    if (!VALID_TYPES.includes(type)) {
      throw new AppError(400, `type must be one of: ${VALID_TYPES.join(', ')}`)
    }

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id:      req.userId!,
        title:        title.trim(),
        description:  description ?? null,
        type,
        status:       'active',
        target_value: target_value ?? null,
        current_value: 0,
        unit:         unit ?? null,
        start_date:   start_date ?? null,
        target_date:  target_date ?? null,
        color:        color ?? null,
        emoji:        emoji ?? null,
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create goal: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Update goal ───────────────────────────────────────────────────────────

  router.patch('/goals/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const updates: Record<string, unknown> = { ...req.body }

    // Validate enum fields if provided
    if (updates.type && !VALID_TYPES.includes(updates.type as GoalType)) {
      throw new AppError(400, `type must be one of: ${VALID_TYPES.join(', ')}`)
    }
    if (updates.status && !VALID_STATUSES.includes(updates.status as GoalStatus)) {
      throw new AppError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Trim title if present
    if (typeof updates.title === 'string') {
      updates.title = updates.title.trim()
      if (!updates.title) throw new AppError(400, 'title cannot be empty')
    }

    // Strip immutable fields
    delete updates.user_id
    delete updates.id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabaseAdmin
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update goal: ${error.message}`)
    if (!data)  throw new AppError(404, 'Goal not found')

    res.json(data)
  }))

  // ── Delete goal ───────────────────────────────────────────────────────────

  router.delete('/goals/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete goal: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── List milestones ───────────────────────────────────────────────────────

  router.get('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new AppError(500, `Failed to fetch milestones: ${error.message}`)

    res.json(data)
  }))

  // ── Create milestone ──────────────────────────────────────────────────────

  router.post('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { title, target_value, sort_order } = req.body as Partial<GoalMilestone>

    if (!title?.trim()) throw new AppError(400, 'title is required')

    // Verify the goal belongs to this user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')

    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .insert({
        goal_id,
        user_id:      req.userId!,
        title:        title.trim(),
        target_value: target_value ?? null,
        sort_order:   sort_order ?? 0,
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create milestone: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Update milestone ──────────────────────────────────────────────────────

  router.patch('/goals/:id/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { milestoneId } = req.params
    const updates: Record<string, unknown> = { ...req.body }

    if (typeof updates.title === 'string') {
      updates.title = updates.title.trim()
      if (!updates.title) throw new AppError(400, 'title cannot be empty')
    }

    // Strip immutable fields
    delete updates.user_id
    delete updates.id
    delete updates.goal_id
    delete updates.created_at

    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update milestone: ${error.message}`)
    if (!data)  throw new AppError(404, 'Milestone not found')

    res.json(data)
  }))

  // ── Delete milestone ──────────────────────────────────────────────────────

  router.delete('/goals/:id/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goal_milestones')
      .delete()
      .eq('id', req.params.milestoneId)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete milestone: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── Log progress ──────────────────────────────────────────────────────────

  router.post('/goals/:id/progress', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { value, note, logged_at } = req.body as Partial<GoalProgressLog>

    if (value === undefined || value === null) throw new AppError(400, 'value is required')
    if (typeof value !== 'number') throw new AppError(400, 'value must be a number')

    // Verify the goal belongs to this user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')

    const { data, error } = await supabaseAdmin
      .from('goal_progress_logs')
      .insert({
        goal_id,
        user_id:   req.userId!,
        value,
        note:      note ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to log progress: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Get progress history ──────────────────────────────────────────────────

  router.get('/goals/:id/progress', asyncRoute(async (req, res) => {
    const { limit } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('goal_progress_logs')
      .select('*')
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('logged_at', { ascending: false })

    if (limit) query = query.limit(Number(limit))

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch progress: ${error.message}`)

    res.json(data)
  }))

  // ── Add link ──────────────────────────────────────────────────────────────

  router.post('/goals/:id/links', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { linked_type, linked_id } = req.body as Partial<GoalLink>

    if (!linked_type) throw new AppError(400, 'linked_type is required')
    if (!linked_id)   throw new AppError(400, 'linked_id is required')
    if (!VALID_LINK_TYPES.includes(linked_type as LinkType)) {
      throw new AppError(400, `linked_type must be one of: ${VALID_LINK_TYPES.join(', ')}`)
    }

    // Verify the goal belongs to this user
    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')

    const { data, error } = await supabaseAdmin
      .from('goal_links')
      .insert({
        goal_id,
        user_id:     req.userId!,
        linked_type,
        linked_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError(409, 'This link already exists')
      throw new AppError(500, `Failed to create link: ${error.message}`)
    }

    res.status(201).json(data)
  }))

  // ── Remove link ───────────────────────────────────────────────────────────

  router.delete('/goals/:id/links/:linkId', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goal_links')
      .delete()
      .eq('id', req.params.linkId)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete link: ${error.message}`)

    res.json({ ok: true })
  }))

  return router
}
