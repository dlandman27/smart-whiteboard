import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { randomUUID } from 'crypto'

export interface Routine {
  id:         string
  title:      string
  category:   'morning' | 'daily' | 'evening'
  emoji:      string
  sort_order: number
  enabled:    boolean
  created_at: string
}

export function routinesRouter(): Router {
  const router = Router()

  // ── List all routines ──────────────────────────────────────────────────

  router.get('/routines', asyncRoute(async (_req, res) => {
    const { data, error } = await supabaseAdmin
      .from('routines')
      .select('*')
      .eq('enabled', true)
      .order('category')
      .order('sort_order')
      .order('created_at')
    if (error) throw new AppError(500, error.message)
    res.json(data)
  }))

  // ── Completions for a date ─────────────────────────────────────────────

  router.get('/routines/completions', asyncRoute(async (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    const { data, error } = await supabaseAdmin
      .from('routine_completions')
      .select('routine_id')
      .eq('date', date)
    if (error) throw new AppError(500, error.message)
    res.json(data.map((r: { routine_id: string }) => r.routine_id))
  }))

  // ── Streak for a routine ───────────────────────────────────────────────

  router.get('/routines/:id/streak', asyncRoute(async (req, res) => {
    const today = new Date()
    let streak = 0
    let checking = new Date(today)

    while (true) {
      const dateStr = checking.toISOString().slice(0, 10)
      const { data } = await supabaseAdmin
        .from('routine_completions')
        .select('id')
        .eq('routine_id', req.params.id)
        .eq('date', dateStr)
        .maybeSingle()
      if (!data) break
      streak++
      checking.setDate(checking.getDate() - 1)
    }

    res.json({ streak })
  }))

  // ── Create routine ─────────────────────────────────────────────────────

  router.post('/routines', asyncRoute(async (req, res) => {
    const { title, category = 'daily', emoji = '✅', sort_order = 0 } = req.body as Partial<Routine>
    if (!title?.trim()) throw new AppError(400, 'title is required')
    if (!['morning', 'daily', 'evening'].includes(category!))
      throw new AppError(400, 'category must be morning, daily, or evening')

    const { data, error } = await supabaseAdmin
      .from('routines')
      .insert({ id: randomUUID(), title: title.trim(), category, emoji, sort_order, enabled: true })
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  }))

  // ── Update routine ─────────────────────────────────────────────────────

  router.patch('/routines/:id', asyncRoute(async (req, res) => {
    const { title, category, emoji, sort_order, enabled } = req.body as Partial<Routine>

    if (category && !['morning', 'daily', 'evening'].includes(category))
      throw new AppError(400, 'category must be morning, daily, or evening')

    const updates: Partial<Routine> = {}
    if (title      !== undefined) updates.title      = title.trim()
    if (category   !== undefined) updates.category   = category
    if (emoji      !== undefined) updates.emoji      = emoji
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (enabled    !== undefined) updates.enabled    = enabled

    const { data, error } = await supabaseAdmin
      .from('routines')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw new AppError(500, error.message)
    if (!data) throw new AppError(404, 'Routine not found')
    res.json(data)
  }))

  // ── Reorder routines ───────────────────────────────────────────────────

  router.post('/routines/reorder', asyncRoute(async (req, res) => {
    const { ids } = req.body as { ids: string[] }
    if (!Array.isArray(ids)) throw new AppError(400, 'ids must be an array')

    await Promise.all(
      ids.map((id, i) =>
        supabaseAdmin.from('routines').update({ sort_order: i }).eq('id', id)
      )
    )

    res.json({ ok: true })
  }))

  // ── Delete routine ─────────────────────────────────────────────────────

  router.delete('/routines/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('routines')
      .delete()
      .eq('id', req.params.id)
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true })
  }))

  // ── Toggle completion ──────────────────────────────────────────────────

  router.post('/routines/:id/complete', asyncRoute(async (req, res) => {
    const date = (req.body.date as string) ?? new Date().toISOString().slice(0, 10)
    const { error } = await supabaseAdmin
      .from('routine_completions')
      .upsert({ routine_id: req.params.id, date }, { onConflict: 'routine_id,date' })
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true, completed: true, date })
  }))

  router.delete('/routines/:id/complete', asyncRoute(async (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    const { error } = await supabaseAdmin
      .from('routine_completions')
      .delete()
      .eq('routine_id', req.params.id)
      .eq('date', date)
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true, completed: false, date })
  }))

  return router
}
