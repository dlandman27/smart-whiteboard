import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function icalFeedsRouter(): Router {
  const router = Router()

  router.get('/ical-feeds', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('ical_feeds')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: true })
    if (error) throw new AppError(500, error.message)
    res.json({ feeds: data ?? [] })
  }))

  router.post('/ical-feeds', asyncRoute(async (req, res) => {
    const { name, url, color } = req.body as { name?: string; url?: string; color?: string }
    if (!name?.trim()) throw new AppError(400, 'name is required')
    if (!url?.trim())  throw new AppError(400, 'url is required')

    // Accept webcal:// by treating it as https:// for validation
    const normalized = url.trim().replace(/^webcal:\/\//i, 'https://')
    try { new URL(normalized) } catch { throw new AppError(400, 'Invalid URL') }

    const { data, error } = await supabaseAdmin
      .from('ical_feeds')
      .insert({ user_id: req.userId!, name: name.trim(), url: url.trim(), color: color ?? null })
      .select()
      .single()

    if (error) throw new AppError(500, error.message)
    res.status(201).json(data)
  }))

  router.delete('/ical-feeds/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('ical_feeds')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
    if (error) throw new AppError(500, error.message)
    res.json({ ok: true })
  }))

  return router
}
