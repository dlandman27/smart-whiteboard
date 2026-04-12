import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function tasksRouter(): Router {
  const router = Router()

  // ── List tasks ─────────────────────────────────────────────────────────

  router.get('/tasks', asyncRoute(async (req, res) => {
    const { status, list_name } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId!)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (status)    query = query.eq('status', status)
    if (list_name) query = query.eq('list_name', list_name)

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch tasks: ${error.message}`)

    res.json(data)
  }))

  // ── Distinct list names ────────────────────────────────────────────────

  router.get('/tasks/lists', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('list_name')
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to fetch task lists: ${error.message}`)

    const names = [...new Set((data ?? []).map((r: any) => r.list_name))]
    if (!names.includes('My Tasks')) names.unshift('My Tasks')
    res.json(names)
  }))

  // ── Create task ────────────────────────────────────────────────────────

  router.post('/tasks', asyncRoute(async (req, res) => {
    const { title, notes, due, priority, list_name } = req.body

    if (!title?.trim()) throw new AppError(400, 'Task title is required')

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        user_id:   req.userId!,
        title:     title.trim(),
        notes:     notes ?? null,
        due:       due ?? null,
        priority:  priority ?? 4,
        list_name: list_name ?? 'My Tasks',
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create task: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Update task ────────────────────────────────────────────────────────

  router.patch('/tasks/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const updates: Record<string, any> = { ...req.body }

    // Auto-manage completed_at based on status changes
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString()
    } else if (updates.status === 'needsAction') {
      updates.completed_at = null
    }

    // Don't allow changing user_id or id
    delete updates.user_id
    delete updates.id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update task: ${error.message}`)
    if (!data) throw new AppError(404, 'Task not found')

    res.json(data)
  }))

  // ── Delete task ────────────────────────────────────────────────────────

  router.delete('/tasks/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete task: ${error.message}`)

    res.json({ ok: true })
  }))

  return router
}
