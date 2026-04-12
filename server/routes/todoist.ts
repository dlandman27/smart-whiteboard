import { Router } from 'express'
import { saveOAuthTokens, loadOAuthTokens, deleteOAuthTokens } from '../services/credentials.js'
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

// ── OAuth config ───────────────────────────────────────────────────────────

const TODOIST_CLIENT_ID     = process.env.TODOIST_CLIENT_ID     ?? ''
const TODOIST_CLIENT_SECRET = process.env.TODOIST_CLIENT_SECRET ?? ''

// Short-lived map: OAuth state → userId (for callback)
const pendingOAuth = new Map<string, string>()

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

async function getTodoistToken(userId: string): Promise<string> {
  const tokens = await loadOAuthTokens(userId, 'todoist')
  if (!tokens?.access_token) throw new AppError(401, 'Todoist not connected — connect via Connectors page')
  return tokens.access_token
}

// ── Router ──────────────────────────────────────────────────────────────────

export function todoistRouter(): Router {
  const router = Router()

  // ── Status ──────────────────────────────────────────────────────────────

  router.get('/todoist/status', asyncRoute(async (req, res) => {
    const tokens = await loadOAuthTokens(req.userId!, 'todoist')
    res.json({ connected: !!tokens?.access_token, configured: !!(TODOIST_CLIENT_ID && TODOIST_CLIENT_SECRET) })
  }))

  // ── Connect (start OAuth) ─────────────────────────────────────────────

  router.post('/todoist/connect', (req, res) => {
    if (!TODOIST_CLIENT_ID || !TODOIST_CLIENT_SECRET) {
      throw new AppError(500, 'Todoist OAuth credentials not configured on the server. Set TODOIST_CLIENT_ID and TODOIST_CLIENT_SECRET in .env')
    }

    const state = crypto.randomUUID()
    pendingOAuth.set(state, req.userId!)
    // Clean up after 10 minutes
    setTimeout(() => pendingOAuth.delete(state), 10 * 60_000)

    const params = new URLSearchParams({
      client_id: TODOIST_CLIENT_ID,
      scope:     'data:read_write',
      state,
    })

    const url = `https://todoist.com/oauth/authorize?${params.toString()}`
    res.json({ url })
  })

  // ── OAuth callback ────────────────────────────────────────────────────

  router.get('/todoist/callback', asyncRoute(async (req, res) => {
    if (!TODOIST_CLIENT_ID || !TODOIST_CLIENT_SECRET) {
      throw new AppError(500, 'Todoist OAuth credentials not configured')
    }

    if (req.query.error) {
      throw new AppError(400, `Todoist OAuth error: ${req.query.error}`)
    }

    const state = req.query.state as string
    const userId = pendingOAuth.get(state)
    if (!userId) {
      throw new AppError(400, 'Invalid or expired OAuth state. Please try connecting again.')
    }
    pendingOAuth.delete(state)

    const code = req.query.code as string
    if (!code) throw new AppError(400, 'Missing authorization code')

    // Exchange code for access token
    let accessToken: string
    try {
      const tokenRes = await fetch('https://todoist.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id:     TODOIST_CLIENT_ID,
          client_secret: TODOIST_CLIENT_SECRET,
          code,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!tokenRes.ok) {
        const body = await tokenRes.text().catch(() => '')
        throw new Error(`${tokenRes.status} ${body}`)
      }

      const data = await tokenRes.json()
      accessToken = data.access_token
      if (!accessToken) throw new Error('No access_token in response')
    } catch (e: any) {
      throw new AppError(500, `Failed to exchange code: ${e?.message ?? 'unknown error'}`)
    }

    // Todoist tokens are permanent — no refresh token or expiry needed
    await saveOAuthTokens(userId, 'todoist', { access_token: accessToken })

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected</title></head>
        <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;color:#166534">
          <div style="text-align:center;padding:32px">
            <div style="font-size:52px;margin-bottom:12px">✓</div>
            <h2 style="margin:0 0 8px;font-size:20px">Todoist connected!</h2>
            <p style="margin:0;color:#555;font-size:14px">You can close this window.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'todoist-connected' }, window.location.origin)
              setTimeout(() => window.close(), 800)
            }
          </script>
        </body>
      </html>
    `)
  }))

  // ── Disconnect ────────────────────────────────────────────────────────

  router.post('/todoist/disconnect', asyncRoute(async (req, res) => {
    await deleteOAuthTokens(req.userId!, 'todoist')
    res.json({ ok: true })
  }))

  // ── List projects (cached) ────────────────────────────────────────────

  router.get('/todoist/projects', asyncRoute(async (req, res) => {
    const token = await getTodoistToken(req.userId!)
    const cacheKey = `${req.userId!}:todoist:projects`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const projects = await todoistFetch(token, '/projects')
    setCache(cacheKey, projects)
    res.json(projects)
  }))

  // Get tasks (cached)
  router.get('/todoist/tasks', asyncRoute(async (req, res) => {
    const token = await getTodoistToken(req.userId!)
    const { projectId, filter } = req.query as Record<string, string>

    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (filter)    params.set('filter', filter)

    const cacheKey = `${req.userId!}:todoist:tasks:${params.toString()}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const qs = params.toString()
    const tasks = await todoistFetch(token, `/tasks${qs ? `?${qs}` : ''}`)
    setCache(cacheKey, tasks)
    res.json(tasks)
  }))

  // Complete a task
  router.post('/todoist/tasks/:id/complete', asyncRoute(async (req, res) => {
    const token = await getTodoistToken(req.userId!)
    await todoistFetch(token, `/tasks/${req.params.id}/close`, { method: 'POST' })
    clearUserCache(req.userId!)
    res.json({ ok: true })
  }))

  // Reopen a task
  router.post('/todoist/tasks/:id/reopen', asyncRoute(async (req, res) => {
    const token = await getTodoistToken(req.userId!)
    await todoistFetch(token, `/tasks/${req.params.id}/reopen`, { method: 'POST' })
    clearUserCache(req.userId!)
    res.json({ ok: true })
  }))

  // Create a task
  router.post('/todoist/tasks', asyncRoute(async (req, res) => {
    const token = await getTodoistToken(req.userId!)
    const { content, projectId, dueString } = req.body as { content: string; projectId?: string; dueString?: string }

    if (!content?.trim()) throw new AppError(400, 'Task content is required')

    const body: Record<string, string> = { content: content.trim() }
    if (projectId) body.project_id = projectId
    if (dueString) body.due_string = dueString

    const task = await todoistFetch(token, '/tasks', {
      method: 'POST',
      body:   JSON.stringify(body),
    })

    clearUserCache(req.userId!)
    res.json(task)
  }))

  return router
}
