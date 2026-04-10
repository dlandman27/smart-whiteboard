import { Router } from 'express'
import { google } from 'googleapis'
import { getGCalClient } from '../services/gcal.js'
import { AppError, asyncRoute } from '../middleware/error.js'

async function requireClient(userId: string) {
  const client = await getGCalClient(userId)
  if (!client) throw new AppError(401, 'Not authenticated — connect Google first')
  return google.tasks({ version: 'v1', auth: client as any })
}

export function gtasksRouter(): Router {
  const router = Router()

  // ── Status ────────────────────────────────────────────────────────────────

  router.get('/gtasks/status', asyncRoute(async (req, res) => {
    try {
      const api = await requireClient(req.userId!)
      await api.tasklists.list({ maxResults: 1 })
      res.json({ connected: true })
    } catch (e: any) {
      if (e instanceof AppError) return res.json({ connected: false })
      if (e?.code === 403 || e?.response?.status === 403) {
        return res.json({ connected: false, needsReauth: true })
      }
      return res.json({ connected: false })
    }
  }))

  // ── Task lists ────────────────────────────────────────────────────────────

  router.get('/gtasks/lists', asyncRoute(async (req, res) => {
    const api = await requireClient(req.userId!)
    const { data } = await api.tasklists.list({ maxResults: 100 })
    res.json({ items: data.items ?? [] })
  }))

  // ── Tasks for a list ──────────────────────────────────────────────────────

  router.get('/gtasks/tasks', asyncRoute(async (req, res) => {
    const api = await requireClient(req.userId!)
    const { taskListId, showCompleted } = req.query as Record<string, string>
    if (!taskListId) throw new AppError(400, 'taskListId is required')
    const { data } = await api.tasks.list({
      tasklist:      taskListId,
      showCompleted: showCompleted === 'true',
      showHidden:    false,
      maxResults:    100,
    })
    res.json({ items: data.items ?? [] })
  }))

  // ── Create task ───────────────────────────────────────────────────────────

  router.post('/gtasks/tasks', asyncRoute(async (req, res) => {
    const api = await requireClient(req.userId!)
    const { taskListId, title, notes, due } = req.body
    if (!taskListId) throw new AppError(400, 'taskListId is required')
    if (!title)      throw new AppError(400, 'title is required')
    const { data } = await api.tasks.insert({
      tasklist:    taskListId,
      requestBody: { title, notes, due },
    })
    res.json(data)
  }))

  // ── Update task ───────────────────────────────────────────────────────────

  router.patch('/gtasks/tasks/:taskListId/:taskId', asyncRoute(async (req, res) => {
    const api = await requireClient(req.userId!)
    const { taskListId, taskId } = req.params
    const { data } = await api.tasks.patch({
      tasklist:    taskListId,
      task:        taskId,
      requestBody: req.body,
    })
    res.json(data)
  }))

  // ── Delete task ───────────────────────────────────────────────────────────

  router.delete('/gtasks/tasks/:taskListId/:taskId', asyncRoute(async (req, res) => {
    const api = await requireClient(req.userId!)
    const { taskListId, taskId } = req.params
    await api.tasks.delete({ tasklist: taskListId, task: taskId })
    res.json({ ok: true })
  }))

  return router
}
