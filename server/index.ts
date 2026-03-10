import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { Client } from '@notionhq/client'
import { google } from 'googleapis'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ── Notion ────────────────────────────────────────────────────────────────────

const notion = new Client({ auth: process.env.NOTION_API_KEY })

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: !!process.env.NOTION_API_KEY })
})

app.get('/api/databases', async (_req, res) => {
  try {
    const response = await notion.search({
      filter: { value: 'database', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 100,
    })
    res.json(response)
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: error.code })
  }
})

app.get('/api/databases/:id', async (req, res) => {
  try {
    res.json(await notion.databases.retrieve({ database_id: req.params.id }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/databases/:id/query', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: req.params.id,
      sorts: req.body.sorts,
      filter: req.body.filter,
      page_size: req.body.page_size ?? 50,
    })
    res.json(response)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/databases/:id/pages', async (req, res) => {
  try {
    res.json(await notion.pages.create({
      parent: { database_id: req.params.id },
      properties: req.body.properties,
    }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/pages/:id', async (req, res) => {
  try {
    res.json(await notion.pages.update({ page_id: req.params.id, properties: req.body.properties }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/pages/:id', async (req, res) => {
  try {
    res.json(await notion.pages.update({ page_id: req.params.id, archived: true }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// ── Google Calendar ───────────────────────────────────────────────────────────

const GOOGLE_CONFIGURED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const TOKEN_PATH = path.join(process.cwd(), 'tokens.json')

function loadTokens(): Record<string, string> | null {
  try { return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')) } catch { return null }
}

function saveTokens(tokens: Record<string, string>) {
  const existing = loadTokens() ?? {}
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...tokens }))
}

let oauth2Client: ReturnType<typeof google.auth.OAuth2.prototype.constructor> | null = null

if (GOOGLE_CONFIGURED) {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/api/gcal/callback'
  )
  const saved = loadTokens()
  if (saved) oauth2Client.setCredentials(saved)

  oauth2Client.on('tokens', (tokens: any) => {
    saveTokens(tokens)
    oauth2Client!.setCredentials({ ...loadTokens(), ...tokens })
  })
}

// Status — is Google Calendar configured and authenticated?
app.get('/api/gcal/status', (_req, res) => {
  if (!GOOGLE_CONFIGURED) return res.json({ configured: false, connected: false })
  const tokens = loadTokens()
  res.json({ configured: true, connected: !!(tokens?.refresh_token || tokens?.access_token) })
})

// Start OAuth flow — open this in a popup/new tab
app.get('/api/gcal/auth', (_req, res) => {
  if (!oauth2Client) return res.status(400).send('Google credentials not set in .env')
  const url = (oauth2Client as any).generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  })
  res.redirect(url)
})

// OAuth callback — Google redirects here after consent
app.get('/api/gcal/callback', async (req, res) => {
  if (!oauth2Client) return res.status(400).send('Not configured')
  try {
    const { tokens } = await (oauth2Client as any).getToken(req.query.code as string)
    saveTokens(tokens)
    oauth2Client.setCredentials(tokens)
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
  } catch (error: any) {
    res.status(500).send('Auth failed: ' + error.message)
  }
})

// List all calendars the user has access to
app.get('/api/gcal/calendars', async (_req, res) => {
  if (!oauth2Client) return res.status(400).json({ error: 'Not configured' })
  try {
    const cal = google.calendar({ version: 'v3', auth: oauth2Client as any })
    const response = await cal.calendarList.list({ minAccessRole: 'reader' })
    res.json(response.data)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Fetch events within a time range
app.get('/api/gcal/events', async (req, res) => {
  if (!oauth2Client) return res.status(400).json({ error: 'Not configured' })
  try {
    const cal = google.calendar({ version: 'v3', auth: oauth2Client as any })
    const { timeMin, timeMax, calendarId = 'primary' } = req.query as Record<string, string>
    const response = await cal.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })
    res.json(response.data)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`\n🗂  Smart Whiteboard server running on http://localhost:${PORT}`)
  if (!process.env.NOTION_API_KEY)  console.warn('⚠️  NOTION_API_KEY not set')
  else                              console.log('✅  Notion API key loaded')
  if (!GOOGLE_CONFIGURED)           console.warn('⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google Calendar disabled')
  else {
    const tokens = loadTokens()
    if (tokens?.refresh_token || tokens?.access_token) console.log('✅  Google Calendar authenticated')
    else console.warn('   Google Calendar configured but not authenticated — visit http://localhost:3001/api/gcal/auth')
  }
})
