import { Router } from 'express'
import { google } from 'googleapis'
import { loadTokens, saveTokens } from '../services/tokens.js'
import { getGCalClient, setPendingGCalAuth, pendingGCalAuth } from '../services/gcal.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function gcalRouter(): Router {
  const router = Router()

  router.get('/gcal/status', (_req, res) => {
    const tokens = loadTokens()
    res.json({ connected: !!(tokens?.refresh_token || tokens?.access_token) })
  })

  router.post('/gcal/start-auth', (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body as Record<string, string>
    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError(400, 'clientId, clientSecret, and redirectUri are required')
    }
    setPendingGCalAuth({ clientId, clientSecret, redirectUri })
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const url = (client as any).generateAuthUrl({
      access_type: 'offline',
      scope:       ['https://www.googleapis.com/auth/calendar.readonly'],
      prompt:      'consent',
    })
    res.json({ url })
  })

  router.get('/gcal/callback', asyncRoute(async (req, res) => {
    if (!pendingGCalAuth) throw new AppError(400, 'No pending Google Calendar auth — initiate via Settings')
    const { clientId, clientSecret, redirectUri } = pendingGCalAuth
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await (client as any).getToken(req.query.code as string)
    saveTokens({ ...tokens, gcal_client_id: clientId, gcal_client_secret: clientSecret, gcal_redirect_uri: redirectUri })
    setPendingGCalAuth(null)
    res.send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0;background:#f0fdf4;color:#166534">
        <div style="text-align:center">
          <div style="font-size:48px">✓</div>
          <h2>Google Calendar connected!</h2>
          <p style="color:#555">You can close this window.</p>
          <script>setTimeout(() => window.close(), 1500)</script>
        </div>
      </body></html>
    `)
  }))

  router.get('/gcal/calendars', asyncRoute(async (_req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    res.json((await cal.calendarList.list({ minAccessRole: 'reader' })).data)
  }))

  router.get('/gcal/events', asyncRoute(async (req, res) => {
    const client = getGCalClient()
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    const { timeMin, timeMax, calendarId = 'primary' } = req.query as Record<string, string>
    const response = await cal.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 100 })
    res.json(response.data)
  }))

  return router
}
