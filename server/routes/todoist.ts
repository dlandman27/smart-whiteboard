import { Router } from 'express'
import { loadCredential, saveCredential, deleteCredential } from '../services/credentials.js'
import { AppError, asyncRoute } from '../middleware/error.js'

// ── Simple cache (1-min TTL) ────────────────────────────────────────────────

interface CacheEntry { data: any; expiry: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60_000

function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) { cache.delete(key); return null }
  return entry.data
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

function clearUserCache(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(userId + ':')) cache.delete(key)
  }
}

// ── Todoist API helper ──────────────────────────────────────────────────────

const TODOIST_API = 'https://api.todoist.com/rest/v2'

async function todoistFetch(apiKey: string, path: string, options?: RequestInit) {
  const res = await fetch(`${TODOIST_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      ...options?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new AppError(res.status, `Todoist API error: ${res.status} ${body}`)
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return null
  return res.json()
}

async function getTodoistKey(userId: string): Promise<string> {
  const cred = await loadCredential(userId, 'todoist')
  if (!cred?.api_key) throw new AppError(401, 'Todoist not connected — add your API token in Connectors')
  return cred.api_key
}

// ── Router ──────────────────────────────────────────────────────────────────

export function todoistRouter(): Router {
  const router = Router()

  // Check connection status
  router.get('/todoist/status', asyncRoute(async (req, res) => {
    const cred = await loadCredential(req.userId!, 'todoist')
    res.json({ connected: !!cred?.api_key })
  }))

  // List projects (cached)
  router.get('/todoist/projects', asyncRoute(async (req, res) => {
    const apiKey = await getTodoistKey(req.userId!)
    const cacheKey = `${req.userId!}:todoist:projects`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const projects = await todoistFetch(apiKey, '/projects')
    setCache(cacheKey, projects)
    res.json(projects)
  }))

  // Get tasks (cached)
  router.get('/todoist/tasks', asyncRoute(async (req, res) => {
    const apiKey = await getTodoistKey(req.userId!)
    const { projectId, filter } = req.query as Record<string, string>

    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (filter)    params.set('filter', filter)

    const cacheKey = `${req.userId!}:todoist:tasks:${params.toString()}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const qs = params.toString()
    const tasks = await todoistFetch(apiKey, `/tasks${qs ? `?${qs}` : ''}`)
    setCache(cacheKey, tasks)
    res.json(tasks)
  }))

  // Complete a task
  router.post('/todoist/tasks/:id/complete', asyncRoute(async (req, res) => {
    const apiKey = await getTodoistKey(req.userId!)
    await todoistFetch(apiKey, `/tasks/${req.params.id}/close`, { method: 'POST' })
    clearUserCache(req.userId!)
    res.json({ ok: true })
  }))

  // Reopen a task
  router.post('/todoist/tasks/:id/reopen', asyncRoute(async (req, res) => {
    const apiKey = await getTodoistKey(req.userId!)
    await todoistFetch(apiKey, `/tasks/${req.params.id}/reopen`, { method: 'POST' })
    clearUserCache(req.userId!)
    res.json({ ok: true })
  }))

  // Create a task
  router.post('/todoist/tasks', asyncRoute(async (req, res) => {
    const apiKey = await getTodoistKey(req.userId!)
    const { content, projectId, dueString } = req.body as { content: string; projectId?: string; dueString?: string }

    if (!content?.trim()) throw new AppError(400, 'Task content is required')

    const body: Record<string, string> = { content: content.trim() }
    if (projectId) body.project_id = projectId
    if (dueString) body.due_string = dueString

    const task = await todoistFetch(apiKey, '/tasks', {
      method: 'POST',
      body:   JSON.stringify(body),
    })

    clearUserCache(req.userId!)
    res.json(task)
  }))

  return router
}
