import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function eventsRouter(): Router {
  const router = Router()

  // ── List events ────────────────────────────────────────────────────────

  router.get('/events', asyncRoute(async (req, res) => {
    const { timeMin, timeMax, calendar_name } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('events')
      .select('*')
      .eq('user_id', req.userId!)
      .order('start_at', { ascending: true })

    if (timeMin)       query = query.gte('start_at', timeMin)
    if (timeMax)       query = query.lte('start_at', timeMax)
    if (calendar_name) query = query.eq('calendar_name', calendar_name)

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch events: ${error.message}`)

    res.json(data)
  }))

  // ── Distinct calendar names ────────────────────────────────────────────

  router.get('/events/calendars', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('calendar_name')
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to fetch calendars: ${error.message}`)

    const calendars = [...new Set((data ?? []).map((r: any) => r.calendar_name))]
    res.json(calendars)
  }))

  // ── Create event ───────────────────────────────────────────────────────

  router.post('/events', asyncRoute(async (req, res) => {
    const { title, description, location, start_at, end_at, all_day, color, calendar_name } = req.body

    if (!title?.trim())  throw new AppError(400, 'Event title is required')
    if (!start_at)       throw new AppError(400, 'Event start_at is required')

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        user_id:       req.userId!,
        title:         title.trim(),
        description:   description ?? null,
        location:      location ?? null,
        start_at,
        end_at:        end_at ?? null,
        all_day:       all_day ?? false,
        color:         color ?? null,
        calendar_name: calendar_name ?? 'My Calendar',
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create event: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Update event ───────────────────────────────────────────────────────

  router.patch('/events/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const updates: Record<string, any> = { ...req.body }

    // Don't allow changing user_id or id
    delete updates.user_id
    delete updates.id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update event: ${error.message}`)
    if (!data) throw new AppError(404, 'Event not found')

    res.json(data)
  }))

  // ── Delete event ───────────────────────────────────────────────────────

  router.delete('/events/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete event: ${error.message}`)

    res.json({ ok: true })
  }))

  return router
}
