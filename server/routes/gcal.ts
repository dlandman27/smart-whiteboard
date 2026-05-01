import { Router } from 'express'
import { google } from 'googleapis'
import { getGCalClient, getGCalOAuth2Client, CLIENT_ID } from '../services/gcal.js'
import { saveOAuthTokens, deleteOAuthTokens, loadAllOAuthTokens } from '../services/credentials.js'
import { AppError, asyncRoute } from '../middleware/error.js'

// Short-lived map: OAuth state → userId (for callback)
const pendingOAuth = new Map<string, string>()

export function gcalRouter(): Router {
  const router = Router()

  // ── Status ────────────────────────────────────────────────────────────────

  router.get('/gcal/status', asyncRoute(async (req, res) => {
    const accounts = await loadAllOAuthTokens(req.userId!, 'gcal')
    res.json({ connected: accounts.length > 0, configured: !!CLIENT_ID })
  }))

  // ── Connected accounts ────────────────────────────────────────────────────

  router.get('/gcal/accounts', asyncRoute(async (req, res) => {
    const accounts = await loadAllOAuthTokens(req.userId!, 'gcal')
    res.json({
      accounts: accounts.map((a) => ({
        accountId: a.account_id ?? 'primary',
        email:     a.account_email ?? a.account_id ?? 'primary',
      })),
    })
  }))

  // ── Connect (start OAuth) ─────────────────────────────────────────────────

  router.post('/gcal/connect', (req, res) => {
    if (!CLIENT_ID) throw new AppError(500, 'Google OAuth credentials not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')
    const state = crypto.randomUUID()
    pendingOAuth.set(state, req.userId!)
    setTimeout(() => pendingOAuth.delete(state), 10 * 60_000)

    const client = getGCalOAuth2Client()
    const url = (client as any).generateAuthUrl({
      access_type: 'offline',
      scope:       [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/photoslibrary.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent select_account',
      state,
    })
    res.json({ url })
  })

  // ── OAuth callback ────────────────────────────────────────────────────────

  router.get('/gcal/callback', asyncRoute(async (req, res) => {
    if (!CLIENT_ID) throw new AppError(500, 'Google OAuth credentials not configured')
    if (req.query.error) throw new AppError(400, `Google OAuth error: ${req.query.error}`)

    const state = req.query.state as string
    const userId = pendingOAuth.get(state)
    if (!userId) throw new AppError(400, 'Invalid or expired OAuth state. Please try connecting again.')
    pendingOAuth.delete(state)

    const client = getGCalOAuth2Client()
    let tokens: any
    try {
      const result = await (client as any).getToken(req.query.code as string)
      tokens = result.tokens
    } catch (e: any) {
      throw new AppError(500, `Failed to exchange code: ${e?.response?.data?.error_description ?? e?.message ?? 'unknown error'}`)
    }

    // Fetch the Google account email to use as accountId
    client.setCredentials(tokens)
    let accountEmail = 'primary'
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client as any })
      const info = await oauth2.userinfo.get()
      accountEmail = info.data.email ?? 'primary'
    } catch {
      // Fall back to 'primary' if we can't fetch the email
    }

    const accountId = accountEmail

    await saveOAuthTokens(userId, 'gcal', {
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
      account_id:    accountId,
      account_email: accountEmail,
    }, accountId)

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connected</title></head>
        <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;color:#166534">
          <div style="text-align:center;padding:32px">
            <div style="font-size:52px;margin-bottom:12px">✓</div>
            <h2 style="margin:0 0 8px;font-size:20px">Google Calendar connected!</h2>
            <p style="margin:0;color:#555;font-size:14px">${accountEmail !== 'primary' ? accountEmail + '<br>' : ''}You can close this window.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'gcal-connected', accountId: ${JSON.stringify(accountId)}, email: ${JSON.stringify(accountEmail)} }, window.location.origin)
              setTimeout(() => window.close(), 800)
            }
          </script>
        </body>
      </html>
    `)
  }))

  // ── Disconnect ────────────────────────────────────────────────────────────

  router.post('/gcal/disconnect', asyncRoute(async (req, res) => {
    const { accountId } = req.body as { accountId?: string }
    await deleteOAuthTokens(req.userId!, 'gcal', accountId)
    res.json({ ok: true })
  }))

  // ── Calendars (all accounts) ──────────────────────────────────────────────

  router.get('/gcal/calendars', asyncRoute(async (req, res) => {
    const { accountId } = req.query as { accountId?: string }
    const accounts = await loadAllOAuthTokens(req.userId!, 'gcal')
    if (!accounts.length) throw new AppError(401, 'Not authenticated')

    const targets = accountId
      ? accounts.filter((a) => a.account_id === accountId)
      : accounts

    const allCalendars: any[] = []
    await Promise.allSettled(
      targets.map(async (acct) => {
        const client = await getGCalClient(req.userId!, acct.account_id ?? 'primary')
        if (!client) return
        const cal = google.calendar({ version: 'v3', auth: client as any })
        const result = await cal.calendarList.list({ minAccessRole: 'reader' })
        for (const item of result.data.items ?? []) {
          allCalendars.push({ ...item, accountId: acct.account_id ?? 'primary', accountEmail: acct.account_email })
        }
      }),
    )

    res.json({ items: allCalendars })
  }))

  // ── Events ────────────────────────────────────────────────────────────────

  router.get('/gcal/events', asyncRoute(async (req, res) => {
    const { timeMin, timeMax, calendarId = 'primary', accountId = 'primary' } = req.query as Record<string, string>
    const client = await getGCalClient(req.userId!, accountId)
    if (!client) throw new AppError(401, 'Google Calendar not connected')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    try {
      const response = await cal.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 })
      res.json(response.data)
    } catch (err: any) {
      const status = err?.response?.status ?? err?.code ?? 500
      const message = err?.response?.data?.error?.message ?? err?.message ?? 'Google Calendar error'
      throw new AppError(status === 401 || status === 403 ? status : 502, message)
    }
  }))

  router.post('/gcal/events', asyncRoute(async (req, res) => {
    const { calendarId = 'primary', accountId = 'primary', ...eventBody } = req.body
    const client = await getGCalClient(req.userId!, accountId)
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    const response = await cal.events.insert({ calendarId, requestBody: eventBody })
    res.json(response.data)
  }))

  router.delete('/gcal/events/:calendarId/:eventId', asyncRoute(async (req, res) => {
    const { accountId = 'primary' } = req.query as { accountId?: string }
    const client = await getGCalClient(req.userId!, accountId)
    if (!client) throw new AppError(401, 'Not authenticated')
    const cal = google.calendar({ version: 'v3', auth: client as any })
    await cal.events.delete({ calendarId: req.params.calendarId, eventId: req.params.eventId })
    res.json({ ok: true })
  }))

  return router
}
