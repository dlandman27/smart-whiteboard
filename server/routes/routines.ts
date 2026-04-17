import { Router } from 'express'
import { AppError, asyncRoute } from '../middleware/error.js'
import db from '../services/db.js'
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

interface RoutineRow {
  id:         string
  title:      string
  category:   string
  emoji:      string
  sort_order: number
  enabled:    number
  created_at: string
}

function rowToRoutine(r: RoutineRow): Routine {
  return { ...r, enabled: r.enabled === 1, category: r.category as Routine['category'] }
}

export function routinesRouter(): Router {
  const router = Router()

  // ── List all routines ──────────────────────────────────────────────────

  router.get('/routines', (_req, res) => {
    const rows = db.prepare(
      `SELECT * FROM routines WHERE enabled = 1 ORDER BY category, sort_order, created_at`
    ).all() as RoutineRow[]
    res.json(rows.map(rowToRoutine))
  })

  // ── Completions for a date ─────────────────────────────────────────────

  router.get('/routines/completions', (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    const rows = db.prepare(
      `SELECT routine_id FROM routine_completions WHERE date = ?`
    ).all(date) as { routine_id: string }[]
    res.json(rows.map(r => r.routine_id))
  })

  // ── Streak for a routine ───────────────────────────────────────────────

  router.get('/routines/:id/streak', (req, res) => {
    const today = new Date()
    let streak = 0
    let checking = new Date(today)

    while (true) {
      const dateStr = checking.toISOString().slice(0, 10)
      const row = db.prepare(
        `SELECT id FROM routine_completions WHERE routine_id = ? AND date = ?`
      ).get(req.params.id, dateStr)
      if (!row) break
      streak++
      checking.setDate(checking.getDate() - 1)
    }

    res.json({ streak })
  })

  // ── Create routine ─────────────────────────────────────────────────────

  router.post('/routines', asyncRoute(async (req, res) => {
    const { title, category = 'daily', emoji = '✅', sort_order = 0 } = req.body as Partial<Routine>
    if (!title?.trim()) throw new AppError(400, 'title is required')
    if (!['morning', 'daily', 'evening'].includes(category!))
      throw new AppError(400, 'category must be morning, daily, or evening')

    const id  = randomUUID()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO routines (id, title, category, emoji, sort_order, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(id, title.trim(), category, emoji, sort_order, now)

    const row = db.prepare(`SELECT * FROM routines WHERE id = ?`).get(id) as RoutineRow
    res.status(201).json(rowToRoutine(row))
  }))

  // ── Update routine ─────────────────────────────────────────────────────

  router.patch('/routines/:id', asyncRoute(async (req, res) => {
    const { title, category, emoji, sort_order, enabled } = req.body as Partial<Routine>
    const existing = db.prepare(`SELECT * FROM routines WHERE id = ?`).get(req.params.id)
    if (!existing) throw new AppError(404, 'Routine not found')

    if (category && !['morning', 'daily', 'evening'].includes(category))
      throw new AppError(400, 'category must be morning, daily, or evening')

    const fields: string[] = []
    const values: any[]   = []
    if (title      !== undefined) { fields.push('title = ?');      values.push(title.trim()) }
    if (category   !== undefined) { fields.push('category = ?');   values.push(category) }
    if (emoji      !== undefined) { fields.push('emoji = ?');      values.push(emoji) }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order) }
    if (enabled    !== undefined) { fields.push('enabled = ?');    values.push(enabled ? 1 : 0) }

    if (fields.length) {
      db.prepare(`UPDATE routines SET ${fields.join(', ')} WHERE id = ?`)
        .run(...values, req.params.id)
    }

    const row = db.prepare(`SELECT * FROM routines WHERE id = ?`).get(req.params.id) as RoutineRow
    res.json(rowToRoutine(row))
  }))

  // ── Reorder routines ───────────────────────────────────────────────────

  router.post('/routines/reorder', asyncRoute(async (req, res) => {
    const { ids } = req.body as { ids: string[] }
    if (!Array.isArray(ids)) throw new AppError(400, 'ids must be an array')

    const update = db.prepare(`UPDATE routines SET sort_order = ? WHERE id = ?`)
    db.transaction(() => {
      ids.forEach((id, i) => update.run(i, id))
    })()

    res.json({ ok: true })
  }))

  // ── Delete routine ─────────────────────────────────────────────────────

  router.delete('/routines/:id', asyncRoute(async (req, res) => {
    const existing = db.prepare(`SELECT id FROM routines WHERE id = ?`).get(req.params.id)
    if (!existing) throw new AppError(404, 'Routine not found')
    db.prepare(`DELETE FROM routines WHERE id = ?`).run(req.params.id)
    res.json({ ok: true })
  }))

  // ── Toggle completion ──────────────────────────────────────────────────

  router.post('/routines/:id/complete', asyncRoute(async (req, res) => {
    const date = (req.body.date as string) ?? new Date().toISOString().slice(0, 10)
    db.prepare(
      `INSERT OR IGNORE INTO routine_completions (routine_id, date) VALUES (?, ?)`
    ).run(req.params.id, date)
    res.json({ ok: true, completed: true, date })
  }))

  router.delete('/routines/:id/complete', asyncRoute(async (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10)
    db.prepare(
      `DELETE FROM routine_completions WHERE routine_id = ? AND date = ?`
    ).run(req.params.id, date)
    res.json({ ok: true, completed: false, date })
  }))

  return router
}
