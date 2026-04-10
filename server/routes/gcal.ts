import { Router } from 'express'
import { google } from 'googleapis'
import { loadTokens, deleteTokens } from '../services/tokens.js'
import { getGCalClient, getGCalOAuth2Client, CLIENT_ID } from '../services/gcal.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function gcalRouter(): Router {
  const router = Router()

  // ── Status ────────────────────────────────────────────────────────────────

  router.get('/gcal/status', (_req, res) => {
    const tokens    = loadTokens()
    const connected = !!(tokens?.refresh_token || tokens?.access_token)
    res.json({ connected, configured: !!CLIENT_ID })
  })

  // ── Connect (start OAuth) ─────────────────────────────────────────────────

  router.post('/gcal/connect', (_req, res) => {
    if (!CLIENT_ID) throw new AppError(500, 'Google OAuth credentials not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')
    const client = getGCalOAuth2Client()
    const url = (client as any).generateAuthUrl({
      access_type: 'offline',
      scope:       ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'],
      prompt:      'consent',
    })
    res.json({ url })
  })

  // ── OAuth callback ────────────────────────────────────────────────────────

  router.get('/gcal/callback', asyncRoute(async (req, res) => {
    if (!CLIENT_ID) throw new AppError(500, 'Google OAuth credentials not configured')
    if (req.query.error) throw new AppError(400, `Google OAuth error: ${req.query.error}`)
    const client = getGCalOAuth2Client()
    let tokens: any
    try {
      const result = await (client as any).getToken(req.query.code as string)
      tokens = result.tokens
    } catch (e: any) {
      throw new AppError(500, `Failed to exchange code: ${e?.response?.data?.error_description ?? e?.message ?? 'unknown error'}`)
    }
    const { saveTokens } = await import('../services/tokens.js')
    saveTokens(tokens)
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected</title></head>
        <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;color:#166534">
          <div style="text-align:center;padding:32px">
            <div style="font-size:52px;margin-bottom:12px">✓</div>
            <h2 style="margin:0 0 8px;font-size:20px">Google Calendar connected!</h2>
            <p style="margin:0;color:#555;font-size:14px">You can close this window.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'gcal-connected' }, '*')
              setTimeout(() => window.close(), 800)
            }
          </script>
        </body>
      </html>
    `)
  }))

  // ── Disconnect ────────────────────────────────────────────────────────────

  router.post('/gcal/disconnect', (_req, res) => {
    deleteTokens(['access_token', 'refresh_token', 'token_type', 'expiry_date', 'scope'])
    res.json({ ok: true })
  })

  // ── Calendars ─────────────────────────────────────────────────────────────

  router.get('/gcal/calendars', asyncRoute(async (_req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    res.json((await cal.calendarList.list({ minAccessRole: 'reader' })).data)
  }))

  // ── Events ────────────────────────────────────────────────────────────────

  router.get('/gcal/events', asyncRoute(async (req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    const { timeMin, timeMax, calendarId = 'primary' } = req.query as Record<string, string>
    const response = await cal.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 })
    res.json(response.data)
  }))

  router.post('/gcal/events', asyncRoute(async (req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    const { calendarId = 'primary', ...eventBody } = req.body
    const response = await cal.events.insert({ calendarId, requestBody: eventBody })
    res.json(response.data)
  }))

  router.delete('/gcal/events/:calendarId/:eventId', asyncRoute(async (req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    await cal.events.delete({ calendarId: req.params.calendarId, eventId: req.params.eventId })
    res.json({ ok: true })
  }))

  return router
}
