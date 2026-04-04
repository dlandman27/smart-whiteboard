import { Router } from 'express'
import { notifLog } from '../services/notify.js'
import { activeTimers } from '../services/timers.js'
import { loadReminders } from '../services/reminders.js'

export function notificationsRouter(): Router {
  const router = Router()

  router.get('/notifications', (_req, res) => {
    res.json(notifLog)
  })

  router.get('/timers', (_req, res) => {
    const now    = Date.now()
    const timers = [...activeTimers.values()]
      .filter((t) => !t.fired)
      .map((t) => ({
        id:          t.id,
        label:       t.label,
        durationMs:  t.durationMs,
        startedAt:   t.startedAt,
        remainingMs: Math.max(0, t.durationMs - (now - t.startedAt)),
      }))
    res.json(timers)
  })

  router.get('/reminders', (_req, res) => {
    const reminders = loadReminders().filter((r) => !r.fired)
    res.json(reminders)
  })

  return router
}
