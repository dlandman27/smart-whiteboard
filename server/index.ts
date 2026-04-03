import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { Client } from '@notionhq/client'
import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

// ── Persistent memory ─────────────────────────────────────────────────────────

const MEMORY_PATH = path.join(process.cwd(), 'server/memory.json')

interface WalliMemory {
  name:        string
  location:    string
  preferences: string[]
  facts:       string[]
  databases:   Record<string, string>
}

let _memory: WalliMemory | null = null

function loadMemory(): WalliMemory {
  if (_memory) return _memory
  try { _memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8')) }
  catch { _memory = { name: '', location: '', preferences: [], facts: [], databases: {} } }
  return _memory!
}

function saveMemory(mem: WalliMemory) {
  _memory = mem
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2))
}

function memoryToPrompt(mem: WalliMemory): string {
  const lines: string[] = []
  if (mem.name)                lines.push(`User's name: ${mem.name}`)
  if (mem.location)            lines.push(`User's location: ${mem.location}`)
  if (mem.preferences.length)  lines.push(`Preferences: ${mem.preferences.join(', ')}`)
  if (mem.facts.length)        lines.push(`Known facts: ${mem.facts.join(', ')}`)
  const dbs = Object.entries(mem.databases)
  if (dbs.length)              lines.push(`Known databases: ${dbs.map(([k, v]) => `${k} (${v})`).join(', ')}`)
  return lines.length ? `\nWhat you know about the user:\n${lines.join('\n')}` : ''
}

const app = express()
app.use(cors())
app.use(express.json())

// ── WebSocket canvas bridge ────────────────────────────────────────────────────

const httpServer = createServer(app)
const wss = new WebSocketServer({ server: httpServer })

const browserClients = new Set<WebSocket>()
let cachedWidgets: unknown[] = []
let cachedCanvas: { width: number; height: number } = { width: 1920, height: 1080 }
let cachedBoards: { id: string; name: string; widgets: unknown[] }[] = []
let cachedActiveBoardId = ''

wss.on('connection', (ws) => {
  browserClients.add(ws)
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'state_update') {
        cachedWidgets      = msg.widgets ?? []
        cachedBoards       = msg.boards  ?? []
        cachedActiveBoardId = msg.activeBoardId ?? ''
        if (msg.canvas) cachedCanvas = msg.canvas
      }
    } catch { /* ignore */ }
  })
  ws.on('close', () => browserClients.delete(ws))
})

function broadcast(msg: object) {
  const payload = JSON.stringify(msg)
  for (const client of browserClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

// ── Canvas control endpoints ───────────────────────────────────────────────────

app.get('/api/canvas/widgets', (_req, res) => {
  res.json({ widgets: cachedWidgets, canvas: cachedCanvas })
})

app.post('/api/canvas/widget', (req, res) => {
  const id = crypto.randomUUID()
  broadcast({ type: 'create_widget', id, ...req.body })
  res.json({ id })
})

app.patch('/api/canvas/widget/:id', (req, res) => {
  broadcast({ type: 'update_widget', id: req.params.id, ...req.body })
  res.json({ ok: true })
})

app.delete('/api/canvas/widget/:id', (req, res) => {
  broadcast({ type: 'delete_widget', id: req.params.id })
  res.json({ ok: true })
})

app.post('/api/canvas/clear-widgets', (_req, res) => {
  broadcast({ type: 'clear_widgets' })
  res.json({ ok: true })
})

app.post('/api/canvas/layout', (req, res) => {
  const { slots } = req.body
  if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots must be an array' })
  broadcast({ type: 'set_custom_layout', slots })
  res.json({ ok: true })
})

app.post('/api/canvas/focus-widget', (req, res) => {
  const { id } = req.body
  if (id) broadcast({ type: 'focus_widget', id })
  else    broadcast({ type: 'unfocus_widget' })
  res.json({ ok: true })
})

app.post('/api/canvas/theme', (req, res) => {
  broadcast({ type: 'set_theme', themeId: req.body.themeId })
  res.json({ ok: true })
})

app.post('/api/canvas/custom-theme', (req, res) => {
  broadcast({ type: 'set_custom_theme', vars: req.body.vars ?? {}, background: req.body.background })
  res.json({ ok: true })
})

// ── Board endpoints ────────────────────────────────────────────────────────────

app.get('/api/canvas/boards', (_req, res) => {
  res.json({ boards: cachedBoards, activeBoardId: cachedActiveBoardId })
})

app.post('/api/canvas/board', (req, res) => {
  const id = crypto.randomUUID()
  broadcast({ type: 'create_board', id, name: req.body.name ?? 'New Board' })
  res.json({ id })
})

app.patch('/api/canvas/board/:id', (req, res) => {
  broadcast({ type: 'rename_board', id: req.params.id, name: req.body.name })
  res.json({ ok: true })
})

app.delete('/api/canvas/board/:id', (req, res) => {
  broadcast({ type: 'delete_board', id: req.params.id })
  res.json({ ok: true })
})

app.post('/api/canvas/board/:id/activate', (req, res) => {
  broadcast({ type: 'switch_board', id: req.params.id })
  res.json({ ok: true })
})

// ── YouTube search proxy ──────────────────────────────────────────────────────

app.get('/api/youtube/search', async (req, res) => {
  const query  = req.query.q as string
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!query)  return res.status(400).json({ error: 'Missing q param' })
  if (!apiKey) return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' })
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    const data = await fetch(url).then((r) => r.json()) as any
    const item = data.items?.[0]
    if (!item) return res.json({ videoId: null })
    res.json({
      videoId: item.id.videoId,
      title:   item.snippet.title,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ── Sports (ESPN proxy) ───────────────────────────────────────────────────────

const ESPN_URLS: Record<string, string> = {
  nfl:        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba:        'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  premierleague: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
  laliga:     'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
  ucl:        'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
  mlb:        'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  nhl:        'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
}

const ESPN_STANDINGS_IDS: Record<string, string> = {
  premierleague: 'eng.1',
  epl:           'eng.1',
  laliga:        'esp.1',
  ucl:           'uefa.champions',
  bundesliga:    'ger.1',
  seriea:        'ita.1',
  ligue1:        'fra.1',
  mls:           'usa.1',
}

app.get('/api/standings/:league', async (req, res) => {
  const leagueId = ESPN_STANDINGS_IDS[req.params.league]
  if (!leagueId) return res.status(400).json({ error: 'Unknown league' })
  try {
    const r = await fetch(`https://site.web.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`)
    const d = await r.json() as any
    const entries = d?.children?.[0]?.standings?.entries ?? []
    const table = entries.map((e: any, i: number) => ({
      pos:    i + 1,
      team:   e.team?.displayName ?? '',
      gp:     e.stats?.find((s: any) => s.abbreviation === 'GP')?.displayValue ?? '-',
      w:      e.stats?.find((s: any) => s.abbreviation === 'W')?.displayValue  ?? '-',
      d:      e.stats?.find((s: any) => s.abbreviation === 'D')?.displayValue  ?? '-',
      l:      e.stats?.find((s: any) => s.abbreviation === 'L')?.displayValue  ?? '-',
      gd:     e.stats?.find((s: any) => s.abbreviation === 'GD')?.displayValue ?? '-',
      pts:    e.stats?.find((s: any) => s.abbreviation === 'P')?.displayValue  ?? '-',
    }))
    res.json({ league: req.params.league, table })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/sports/:league', async (req, res) => {
  const url = ESPN_URLS[req.params.league]
  if (!url) return res.status(400).json({ error: 'Unknown league' })
  try {
    const r = await fetch(url)
    const d = await r.json()
    res.json(d)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

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

// Smart entry: accepts plain key-value pairs, auto-maps to Notion property format
app.post('/api/databases/:id/smart-entry', async (req, res) => {
  try {
    const db   = await notion.databases.retrieve({ database_id: req.params.id })
    const data = req.body.data as Record<string, any>
    const props: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      const prop = (db.properties as any)[key]
      if (!prop) continue
      switch (prop.type) {
        case 'title':        props[key] = { title:        [{ text: { content: String(value) } }] }; break
        case 'rich_text':    props[key] = { rich_text:    [{ text: { content: String(value) } }] }; break
        case 'number':       props[key] = { number:       Number(value) };                           break
        case 'checkbox':     props[key] = { checkbox:     Boolean(value) };                          break
        case 'date':         props[key] = { date:         { start: String(value) } };                break
        case 'select':       props[key] = { select:       { name: String(value) } };                 break
        case 'status':       props[key] = { status:       { name: String(value) } };                 break
        case 'multi_select': props[key] = { multi_select: (Array.isArray(value) ? value : [value]).map((v: any) => ({ name: String(v) })) }; break
        case 'url':          props[key] = { url:          String(value) };                           break
        case 'email':        props[key] = { email:        String(value) };                           break
        case 'phone_number': props[key] = { phone_number: String(value) };                           break
      }
    }

    res.json(await notion.pages.create({ parent: { database_id: req.params.id }, properties: props }))
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

// Stored parent page for AI-created databases — configured once via MCP
app.get('/api/notion/workspace-page', (_req, res) => {
  const tokens = loadTokens()
  const pageId = tokens?.notion_parent_page_id ?? process.env.NOTION_PARENT_PAGE_ID ?? null
  res.json({ pageId })
})

app.post('/api/notion/workspace-page', (req, res) => {
  const { pageId } = req.body
  if (!pageId) return res.status(400).json({ error: 'pageId required' })
  saveTokens({ notion_parent_page_id: pageId })
  res.json({ ok: true })
})

app.post('/api/notion/databases', async (req, res) => {
  try {
    const tokens = loadTokens()
    const { title, properties } = req.body
    const parentPageId = req.body.parentPageId
      ?? tokens?.notion_parent_page_id
      ?? process.env.NOTION_PARENT_PAGE_ID

    if (!parentPageId) {
      return res.status(400).json({
        error: 'No Notion parent page configured. Use set_notion_workspace_page to set one.',
      })
    }

    const db = await notion.databases.create({
      parent:     { type: 'page_id', page_id: parentPageId },
      title:      [{ type: 'text', text: { content: title } }],
      properties: properties,
    } as any)
    res.json({ id: db.id })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/pages/:id/blocks', async (req, res) => {
  try {
    res.json(await notion.blocks.children.list({ block_id: req.params.id, page_size: 100 }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/blocks/:id', async (req, res) => {
  try {
    res.json(await notion.blocks.update({ block_id: req.params.id, ...req.body }))
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_PATH = path.join(process.cwd(), 'tokens.json')

function loadTokens(): Record<string, string> | null {
  try { return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')) } catch { return null }
}

function saveTokens(tokens: Record<string, string>) {
  const existing = loadTokens() ?? {}
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...existing, ...tokens }))
}

// ── Google Calendar ───────────────────────────────────────────────────────────
// Credentials come from the Settings panel in the app, not from .env.

let pendingGCalAuth: { clientId: string; clientSecret: string; redirectUri: string } | null = null

function getGCalClient() {
  const tokens = loadTokens()
  const clientId     = tokens?.gcal_client_id
  const clientSecret = tokens?.gcal_client_secret
  const redirectUri  = tokens?.gcal_redirect_uri ?? 'http://localhost:3001/api/gcal/callback'
  if (!clientId || !clientSecret) return null

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  client.setCredentials({ access_token: tokens?.access_token, refresh_token: tokens?.refresh_token })
  client.on('tokens', (newTokens: any) => saveTokens(newTokens))
  return client
}

app.get('/api/gcal/status', (_req, res) => {
  const tokens = loadTokens()
  res.json({ connected: !!(tokens?.refresh_token || tokens?.access_token) })
})

app.post('/api/gcal/start-auth', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body as Record<string, string>
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ error: 'clientId, clientSecret, and redirectUri are required' })
  }
  pendingGCalAuth = { clientId, clientSecret, redirectUri }
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  const url = (client as any).generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  })
  res.json({ url })
})

app.get('/api/gcal/callback', async (req, res) => {
  if (!pendingGCalAuth) return res.status(400).send('No pending Google Calendar auth — initiate via Settings')
  const { clientId, clientSecret, redirectUri } = pendingGCalAuth
  try {
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await (client as any).getToken(req.query.code as string)
    saveTokens({ ...tokens, gcal_client_id: clientId, gcal_client_secret: clientSecret, gcal_redirect_uri: redirectUri })
    pendingGCalAuth = null
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

app.get('/api/gcal/calendars', async (_req, res) => {
  const client = getGCalClient()
  if (!client) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const cal = google.calendar({ version: 'v3', auth: client as any })
    res.json((await cal.calendarList.list({ minAccessRole: 'reader' })).data)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/gcal/events', async (req, res) => {
  const client = getGCalClient()
  if (!client) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const cal = google.calendar({ version: 'v3', auth: client as any })
    const { timeMin, timeMax, calendarId = 'primary' } = req.query as Record<string, string>
    const response = await cal.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 100 })
    res.json(response.data)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// ── Spotify ───────────────────────────────────────────────────────────────────
// Credentials come from the widget's preferences (stored in the browser),
// not from .env — no server-side config required.

const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'

// Holds credentials for the duration of the OAuth handshake only
let pendingSpotifyAuth: { clientId: string; clientSecret: string; redirectUri: string } | null = null

async function getSpotifyAccessToken(): Promise<string | null> {
  const tokens       = loadTokens()
  const accessToken  = tokens?.spotify_access_token
  const refreshToken = tokens?.spotify_refresh_token
  const clientId     = tokens?.spotify_client_id
  const clientSecret = tokens?.spotify_client_secret
  const expiresAt    = Number(tokens?.spotify_expires_at ?? 0)

  if (!accessToken || !refreshToken || !clientId || !clientSecret) return null
  if (Date.now() < expiresAt - 60_000) return accessToken

  // Refresh
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  const data = await resp.json() as any
  if (!data.access_token) return null

  saveTokens({
    spotify_access_token: data.access_token,
    spotify_expires_at:   String(Date.now() + data.expires_in * 1000),
    ...(data.refresh_token ? { spotify_refresh_token: data.refresh_token } : {}),
  })
  return data.access_token
}

// Status — does the server have valid Spotify tokens?
app.get('/api/spotify/status', (_req, res) => {
  const tokens = loadTokens()
  res.json({ connected: !!(tokens?.spotify_refresh_token || tokens?.spotify_access_token) })
})

// Start auth — widget POSTs its credentials, we store them and return the auth URL
app.post('/api/spotify/start-auth', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body as Record<string, string>
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ error: 'clientId, clientSecret, and redirectUri are required' })
  }
  pendingSpotifyAuth = { clientId, clientSecret, redirectUri }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    scope:         SPOTIFY_SCOPES,
    redirect_uri:  redirectUri,
  })
  res.json({ url: `https://accounts.spotify.com/authorize?${params}` })
})

// OAuth callback — Spotify redirects here with the code
app.get('/api/spotify/callback', async (req, res) => {
  if (!pendingSpotifyAuth) return res.status(400).send('No pending Spotify auth — initiate via the widget')
  const { clientId, clientSecret, redirectUri } = pendingSpotifyAuth
  try {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code:         req.query.code as string,
        redirect_uri: redirectUri,
      }),
    })
    const data = await resp.json() as any
    if (!data.access_token) return res.status(400).send('Token exchange failed: ' + JSON.stringify(data))

    saveTokens({
      spotify_client_id:     clientId,
      spotify_client_secret: clientSecret,
      spotify_access_token:  data.access_token,
      spotify_refresh_token: data.refresh_token,
      spotify_expires_at:    String(Date.now() + data.expires_in * 1000),
    })
    pendingSpotifyAuth = null
    res.send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0;background:#f0fdf4;color:#166534">
        <div style="text-align:center">
          <div style="font-size:48px">✓</div>
          <h2>Spotify connected!</h2>
          <p style="color:#555">You can close this window.</p>
          <script>setTimeout(() => window.close(), 1500)</script>
        </div>
      </body></html>
    `)
  } catch (error: any) {
    res.status(500).send('Auth failed: ' + error.message)
  }
})

// Now playing
app.get('/api/spotify/now-playing', async (_req, res) => {
  try {
    const accessToken = await getSpotifyAccessToken()
    if (!accessToken) return res.status(401).json({ error: 'Not authenticated' })

    const resp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    if (resp.status === 204) return res.json(null)
    if (!resp.ok) return res.status(resp.status).json({ error: 'Spotify API error' })

    const data = await resp.json() as any
    if (!data?.item) return res.json(null)

    res.json({
      isPlaying:   data.is_playing,
      title:       data.item.name,
      artist:      data.item.artists?.map((a: any) => a.name).join(', ') ?? '',
      album:       data.item.album?.name ?? '',
      albumArt:    data.item.album?.images?.[0]?.url ?? null,
      progressMs:  data.progress_ms ?? 0,
      durationMs:  data.item.duration_ms ?? 0,
      externalUrl: data.item.external_urls?.spotify ?? '',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Playback control helper
async function spotifyControl(method: string, endpoint: string, body?: object): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getSpotifyAccessToken()
  if (!accessToken) return { ok: false, error: 'Not authenticated' }
  const res = await fetch(`https://api.spotify.com/v1/me/player${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204 || res.status === 200) return { ok: true }
  const text = await res.text().catch(() => '')
  return { ok: false, error: `Spotify ${res.status}: ${text.slice(0, 100)}` }
}

app.post('/api/spotify/play', async (_req, res) => {
  const r = await spotifyControl('PUT', '/play')
  r.ok ? res.json({ ok: true }) : res.status(400).json(r)
})

app.post('/api/spotify/pause', async (_req, res) => {
  const r = await spotifyControl('PUT', '/pause')
  r.ok ? res.json({ ok: true }) : res.status(400).json(r)
})

app.post('/api/spotify/next', async (_req, res) => {
  const r = await spotifyControl('POST', '/next')
  r.ok ? res.json({ ok: true }) : res.status(400).json(r)
})

app.post('/api/spotify/previous', async (_req, res) => {
  const r = await spotifyControl('POST', '/previous')
  r.ok ? res.json({ ok: true }) : res.status(400).json(r)
})

app.post('/api/spotify/volume', async (req, res) => {
  const volume = Math.max(0, Math.min(100, Number(req.body.volume ?? 50)))
  const r = await spotifyControl('PUT', `/volume?volume_percent=${volume}`)
  r.ok ? res.json({ ok: true }) : res.status(400).json(r)
})

// ── Voice assistant ───────────────────────────────────────────────────────────

const VOICE_THEMES = ['minimal','slate','paper','amber','rose','glass','sage','midnight','stark','forest','ocean','terminal','carbon','dusk','espresso','slate-dark']

// Internal fetch — calls the same Express routes that the MCP server uses,
// so tool implementations live in one place.
async function canvasApi(method: string, path: string, body?: unknown): Promise<any> {
  const port = Number(process.env.PORT) || 3001
  const res  = await fetch(`http://localhost:${port}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  })
  return res.json().catch(() => ({}))
}

const VOICE_TOOLS: Anthropic.Tool[] = [
  {
    name:        'get_board_state',
    description: 'Get all widgets on the active board plus all boards. Always call this first when the user references a widget, list, or board by name.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name:        'add_notion_item',
    description: 'Add an item to a Notion-backed widget (tasks, grocery list, etc.). Use get_board_state first to find the databaseId in the widget settings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string', description: 'Notion database ID from widget settings' },
        title:      { type: 'string', description: 'Item text to add' },
      },
      required: ['databaseId', 'title'],
    },
  },
  {
    name:        'check_off_item',
    description: 'Mark a Notion task or item as done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Notion page ID of the item' },
      },
      required: ['pageId'],
    },
  },
  {
    name:        'create_widget',
    description: 'Add a new widget to the board. Available types: @whiteboard/clock, @whiteboard/weather, @whiteboard/tasks, @whiteboard/note, @whiteboard/pomodoro, @whiteboard/countdown, @whiteboard/quote, @whiteboard/routines, @whiteboard/nfl, @whiteboard/nba, @whiteboard/html.',
    input_schema: {
      type: 'object' as const,
      properties: {
        widgetType: { type: 'string' },
        x:          { type: 'number', description: 'Horizontal position in pixels' },
        y:          { type: 'number', description: 'Vertical position in pixels' },
        width:      { type: 'number' },
        height:     { type: 'number' },
        settings:   { type: 'object' },
      },
      required: ['widgetType'],
    },
  },
  {
    name:        'update_widget',
    description: 'Move, resize, or change settings on a widget. Use get_board_state to find the widget ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id:       { type: 'string' },
        x:        { type: 'number' },
        y:        { type: 'number' },
        width:    { type: 'number' },
        height:   { type: 'number' },
        settings: { type: 'object' },
      },
      required: ['id'],
    },
  },
  {
    name:        'delete_widget',
    description: 'Remove a widget from the board. Use get_board_state to find the widget ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name:        'focus_widget',
    description: 'Expand a widget to fullscreen. Use get_board_state to find the widget ID. Call unfocus_widget to exit.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name:         'unfocus_widget',
    description:  'Exit fullscreen and return the widget to its normal size.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name:        'set_theme',
    description: `Change the whiteboard theme. Available: ${VOICE_THEMES.join(', ')}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        themeId: { type: 'string', enum: VOICE_THEMES },
      },
      required: ['themeId'],
    },
  },
  {
    name:        'list_boards',
    description: 'List all boards and which one is active.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name:        'create_board',
    description: 'Create a new board.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name:        'switch_board',
    description: 'Switch to a different board. Use get_board_state or list_boards to find board IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name:        'rename_board',
    description: 'Rename an existing board.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id:   { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name:        'delete_board',
    description: 'Delete a board. Cannot delete the last board.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name:        'start_timer',
    description: 'Start a pomodoro focus session on an existing Pomodoro widget.',
    input_schema: {
      type: 'object' as const,
      properties: {
        widgetId: { type: 'string' },
      },
      required: ['widgetId'],
    },
  },
  {
    name:        'list_notion_databases',
    description: 'List all Notion databases accessible to this integration.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name:        'get_notion_database',
    description: 'Get the schema (properties and their types) of a specific Notion database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string' },
      },
      required: ['databaseId'],
    },
  },
  {
    name:        'create_notion_database',
    description: 'Create a new Notion database with a custom schema. Returns the database ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:      { type: 'string', description: 'Database name' },
        properties: {
          type: 'object',
          description: 'Notion property definitions. Always include a "Name" title property. Example: { "Name": { "title": {} }, "Date": { "date": {} }, "Amount": { "number": {} }, "Status": { "select": { "options": [{ "name": "Todo", "color": "red" }, { "name": "Done", "color": "green" }] } } }',
        },
      },
      required: ['title', 'properties'],
    },
  },
  {
    name:        'add_notion_entry',
    description: 'Add an entry to any Notion database using plain key-value pairs. The server automatically maps values to the correct Notion property format based on the database schema.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string' },
        data: {
          type: 'object',
          description: 'Plain key-value pairs matching the database property names. E.g. { "Name": "Bench Press", "Date": "2026-03-30", "Sets": 3, "Reps": 10, "Weight": 135 }',
        },
      },
      required: ['databaseId', 'data'],
    },
  },
  {
    name:        'create_notion_view_widget',
    description: `Create a @whiteboard/notion-view widget connected to a Notion database. Choose the best template for the data:
- metric-chart: Single numeric value tracked over time with line/bar chart. fieldMap: { value: "PropName", date: "PropName" }. options: { goal?, unit?, label?, chartType?: "line"|"bar" }
- data-table: All rows as a scrollable table. fieldMap: { columns: ["Prop1","Prop2",...] }. options: { sortBy?, sortDir?: "ascending"|"descending", limit? }
- stat-cards: Aggregate stats (count/sum/avg/latest/min/max). fieldMap: { value: "PropName" }. options: { unit?, stats?: ["count","sum","avg","latest","min","max"] }
- habit-grid: Daily checkbox completion grid. fieldMap: { date: "PropName", done: "PropName" }. options: { weeks? }
- kanban: Cards grouped by a select/status field. fieldMap: { title: "PropName", group: "PropName", subtitle?: "PropName" }. options: { columns?: ["Status1","Status2"] }
- timeline: Date-sorted event list. fieldMap: { title: "PropName", date: "PropName", subtitle?: "PropName", status?: "PropName" }. options: { limit?, sort?: "asc"|"desc" }`,
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId: { type: 'string' },
        template:   { type: 'string', enum: ['metric-chart', 'data-table', 'stat-cards', 'habit-grid', 'kanban', 'timeline'] },
        title:      { type: 'string', description: 'Widget header label' },
        fieldMap:   { type: 'object', description: 'Template field → Notion property name mapping' },
        options:    { type: 'object', description: 'Template-specific display options' },
        x:          { type: 'number' },
        y:          { type: 'number' },
        width:      { type: 'number' },
        height:     { type: 'number' },
      },
      required: ['databaseId', 'template', 'fieldMap'],
    },
  },
  {
    name:        'update_memory',
    description: 'Save something you learned about the user so you remember it in future conversations. Call this whenever you learn the user\'s name, location, a preference, a useful fact, or a Notion database they use often.',
    input_schema: {
      type: 'object' as const,
      properties: {
        field: {
          type: 'string',
          enum: ['name', 'location', 'preference', 'fact', 'database'],
          description: 'What kind of thing you\'re remembering',
        },
        value: { type: 'string', description: 'The value to remember' },
        databaseKey: { type: 'string', description: 'Short label for the database (only used when field is "database")' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name:        'get_standings',
    description: 'Get the current league standings/table for a football (soccer) league. Use this for any question about league positions, points, or tables. Supported leagues: premierleague, laliga, bundesliga, seriea, ligue1, ucl, mls.',
    input_schema: {
      type: 'object' as const,
      properties: {
        league:  { type: 'string', description: 'League key, e.g. "premierleague", "laliga"' },
        team:    { type: 'string', description: 'Optional: filter to a specific team name to answer positional questions' },
        display: { type: 'boolean', description: 'If true, create an HTML widget showing the full table. If false, just return the data to answer a spoken question.' },
      },
      required: ['league'],
    },
  },
  {
    name:        'web_search',
    description: 'Search the internet via Brave Search for current information — scores, standings, news, weather, facts, prices, etc. Use this when you need live data or when the user asks about something you may not know. Returns titles, snippets, and URLs from the top results.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query, e.g. "Premier League table 2025" or "Manchester United next match"' },
      },
      required: ['query'],
    },
  },
  {
    name:        'fetch_page',
    description: 'Fetch the text content of a webpage. Use this after web_search to read the actual content of a result URL and extract useful information from it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'Full URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name:        'open_url',
    description: 'Create or update a Website widget that embeds a URL in an iframe. Use this when the user asks to "show me", "open", or "display" a website. Pick the best URL for what they want — e.g. "show me the Premier League table" → "https://www.premierleague.com/tables". Use get_board_state first to find an existing url widget to reuse.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url:      { type: 'string', description: 'Full URL including https://' },
        title:    { type: 'string', description: 'Short label shown above the widget' },
        widgetId: { type: 'string', description: 'Existing @whiteboard/url widget ID to update. Omit to create a new one.' },
      },
      required: ['url'],
    },
  },
  {
    name:        'spotify_control',
    description: 'Control Spotify playback. Use this when the user says play, pause, skip, next, previous, or asks what\'s playing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['play', 'pause', 'next', 'previous', 'now_playing'],
          description: 'play=resume, pause=pause, next=skip, previous=go back, now_playing=read what\'s currently on',
        },
      },
      required: ['action'],
    },
  },
  {
    name:        'read_notion_items',
    description: 'Fetch and read out items from a Notion database — tasks, grocery list, habits, etc. Returns a spoken-friendly list of the open/pending items. Filter to only incomplete items unless the user asks for all.',
    input_schema: {
      type: 'object' as const,
      properties: {
        databaseId:   { type: 'string', description: 'Notion database ID' },
        statusFilter: { type: 'string', description: 'Optional: only return items with this status, e.g. "Not started" or "In progress". Omit to get all non-done items.' },
        limit:        { type: 'number', description: 'Max items to return (default 10)' },
      },
      required: ['databaseId'],
    },
  },
  {
    name:        'search_youtube',
    description: 'Search YouTube for a video and display it in a YouTube widget. Use get_board_state first to find an existing YouTube widget ID, or create one if none exists.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query:    { type: 'string', description: 'Search query, e.g. "lofi hip hop" or "how to make pasta"' },
        widgetId: { type: 'string', description: 'YouTube widget ID to update. If omitted, a new widget is created.' },
      },
      required: ['query'],
    },
  },
]

// ── Notion schema cache ───────────────────────────────────────────────────────

const schemaCache = new Map<string, { props: any[]; ts: number }>()
const SCHEMA_TTL  = 5 * 60 * 1000 // 5 min

async function getCachedSchema(databaseId: string) {
  const hit = schemaCache.get(databaseId)
  if (hit && Date.now() - hit.ts < SCHEMA_TTL) return hit.props
  const db    = await notion.databases.retrieve({ database_id: databaseId })
  const props = Object.entries(db.properties as any).map(([name, p]: [string, any]) => ({
    name, type: p.type,
    ...(p.select       ? { options: p.select.options.map((o: any) => o.name) }       : {}),
    ...(p.multi_select ? { options: p.multi_select.options.map((o: any) => o.name) } : {}),
    ...(p.status       ? { options: p.status.options.map((o: any) => o.name) }       : {}),
  }))
  schemaCache.set(databaseId, { props, ts: Date.now() })
  return props
}

// ── Board state snapshot for system prompt ────────────────────────────────────

// Scan all boards for widgets that have a databaseId and auto-save any new ones to memory
function autoSaveDatabases() {
  if (!cachedBoards.length) return
  const mem = loadMemory()
  const knownIds = new Set(Object.values(mem.databases))
  let changed = false
  for (const board of cachedBoards) {
    for (const w of (board.widgets ?? []) as any[]) {
      const dbId = w.settings?.databaseId as string | undefined
      if (!dbId || knownIds.has(dbId)) continue
      // Use the widget's display title, then settings.title, then type as the key
      const label: string = w.databaseTitle ?? w.settings?.title ?? w.settings?.label ?? w.type ?? dbId
      mem.databases[label] = dbId
      knownIds.add(dbId)
      changed = true
      console.log(`[memory] auto-saved database "${label}" → ${dbId}`)
    }
  }
  if (changed) saveMemory(mem)
}

function getBoardSnapshot(): string {
  autoSaveDatabases()
  const board = (cachedBoards ?? []).find((b: any) => b.id === cachedActiveBoardId)
  if (!board) return ''
  const widgets = (board.widgets ?? []).map((w: any) =>
    `  - id:${w.id} type:${w.type}${w.settings?.databaseId ? ` databaseId:${w.settings.databaseId}` : ''}${w.settings?.title ? ` title:"${w.settings.title}"` : ''}${w.databaseTitle ? ` label:"${w.databaseTitle}"` : ''}`
  ).join('\n')
  return `\nCurrent board: "${board.name}" (id:${board.id})\nWidgets on board:\n${widgets || '  (none)'}`
}

function ordinal(n: number): string {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function leagueLabel(key: string): string {
  const labels: Record<string, string> = {
    premierleague: 'Premier League', epl: 'Premier League',
    laliga: 'La Liga', bundesliga: 'Bundesliga',
    seriea: 'Serie A', ligue1: 'Ligue 1',
    ucl: 'Champions League', mls: 'MLS',
  }
  return labels[key] ?? key
}

async function executeVoiceTool(name: string, input: Record<string, any>): Promise<string> {
  switch (name) {

    case 'get_board_state': {
      const [widgetData, boardData] = await Promise.all([
        canvasApi('GET', '/api/canvas/widgets'),
        canvasApi('GET', '/api/canvas/boards'),
      ])
      return JSON.stringify({
        activeBoardId:   boardData.activeBoardId,
        activeBoardName: (boardData.boards ?? []).find((b: any) => b.id === boardData.activeBoardId)?.name ?? 'Unknown',
        boards:          (boardData.boards ?? []).map((b: any) => ({ id: b.id, name: b.name })),
        canvas:          widgetData.canvas,
        widgets:         widgetData.widgets,
      })
    }

    case 'add_notion_item': {
      const { databaseId, title } = input as { databaseId: string; title: string }
      await notion.pages.create({
        parent:     { database_id: databaseId },
        properties: { Name: { title: [{ text: { content: title } }] } },
      })
      return `Added "${title}"`
    }

    case 'check_off_item': {
      await notion.pages.update({
        page_id:    input.pageId,
        properties: { Status: { status: { name: 'Done' } } },
      })
      return `Checked off item ${input.pageId}`
    }

    case 'create_widget': {
      const { id } = await canvasApi('POST', '/api/canvas/widget', input)
      return `Created ${input.widgetType} widget (id: ${id})`
    }

    case 'update_widget': {
      const { id, ...rest } = input
      await canvasApi('PATCH', `/api/canvas/widget/${id}`, rest)
      return `Updated widget ${id}`
    }

    case 'delete_widget': {
      await canvasApi('DELETE', `/api/canvas/widget/${input.id}`)
      return `Deleted widget ${input.id}`
    }

    case 'focus_widget': {
      await canvasApi('POST', '/api/canvas/focus-widget', { id: input.id })
      return `Widget ${input.id} fullscreened`
    }

    case 'unfocus_widget': {
      await canvasApi('POST', '/api/canvas/focus-widget', {})
      return 'Fullscreen exited'
    }

    case 'set_theme': {
      await canvasApi('POST', '/api/canvas/theme', { themeId: input.themeId })
      return `Theme set to ${input.themeId}`
    }

    case 'list_boards': {
      const data = await canvasApi('GET', '/api/canvas/boards')
      return JSON.stringify(data)
    }

    case 'create_board': {
      const { id } = await canvasApi('POST', '/api/canvas/board', { name: input.name })
      return `Created board "${input.name}" (id: ${id})`
    }

    case 'switch_board': {
      await canvasApi('POST', `/api/canvas/board/${input.id}/activate`)
      return `Switched to board ${input.id}`
    }

    case 'rename_board': {
      await canvasApi('PATCH', `/api/canvas/board/${input.id}`, { name: input.name })
      return `Renamed board to "${input.name}"`
    }

    case 'delete_board': {
      await canvasApi('DELETE', `/api/canvas/board/${input.id}`)
      return `Deleted board ${input.id}`
    }

    case 'start_timer': {
      broadcast({ type: 'widget_event', widgetId: input.widgetId, event: 'start' })
      return 'Timer started'
    }

    case 'list_notion_databases': {
      const response = await notion.search({ filter: { value: 'database', property: 'object' } })
      return JSON.stringify((response.results as any[]).map((db: any) => ({
        id:    db.id,
        title: db.title?.[0]?.plain_text ?? 'Untitled',
      })))
    }

    case 'get_notion_database': {
      const props = await getCachedSchema(input.databaseId)
      return JSON.stringify({ id: input.databaseId, properties: props })
    }

    case 'create_notion_database': {
      const port     = Number(process.env.PORT) || 3001
      const result   = await fetch(`http://localhost:${port}/api/notion/databases`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: input.title, properties: input.properties }),
      }).then((r) => r.json()) as { id?: string; error?: string }
      if (result.error) return `Failed to create database: ${result.error}`
      return `Created database "${input.title}" (id: ${result.id})`
    }

    case 'add_notion_entry': {
      const port   = Number(process.env.PORT) || 3001
      const result = await fetch(`http://localhost:${port}/api/databases/${input.databaseId}/smart-entry`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: input.data }),
      }).then((r) => r.json()) as { id?: string; error?: string }
      if (result.error) return `Failed to add entry: ${result.error}`
      return `Added entry to database`
    }

    case 'create_notion_view_widget': {
      const { databaseId, template, title, fieldMap, options, x, y, width, height } = input
      const { id } = await canvasApi('POST', '/api/canvas/widget', {
        widgetType: '@whiteboard/notion-view',
        x, y,
        width:    width  ?? 400,
        height:   height ?? 320,
        settings: { databaseId, template, title, fieldMap, options: options ?? {} },
      })
      return `Created ${template} widget for database (id: ${id})`
    }

    case 'update_memory': {
      const mem = loadMemory()
      const { field, value, databaseKey } = input as { field: string; value: string; databaseKey?: string }
      if (field === 'name')        mem.name = value
      else if (field === 'location')    mem.location = value
      else if (field === 'preference')  { if (!mem.preferences.includes(value)) mem.preferences.push(value) }
      else if (field === 'fact')        { if (!mem.facts.includes(value)) mem.facts.push(value) }
      else if (field === 'database')    mem.databases[databaseKey ?? value] = value
      saveMemory(mem)
      return `Remembered: ${field} = ${value}`
    }

    case 'get_standings': {
      const { league, team, display } = input as { league: string; team?: string; display?: boolean }
      const port = Number(process.env.PORT) || 3001
      const r    = await fetch(`http://localhost:${port}/api/standings/${league}`)
      if (!r.ok) return `Could not fetch standings for ${league}`
      const { table } = await r.json() as { table: any[] }

      if (team) {
        const row = table.find((t) => t.team.toLowerCase().includes(team.toLowerCase()))
        if (!row) return `${team} not found in ${league} standings`
        return `${row.team} are ${row.pos}${ordinal(row.pos)} with ${row.pts} points from ${row.gp} games (${row.w}W ${row.d}D ${row.l}L, GD ${row.gd})`
      }

      if (display) {
        const rows = table.map((t) =>
          `<tr><td>${t.pos}</td><td class="team">${t.team}</td><td>${t.gp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gd}</td><td class="pts">${t.pts}</td></tr>`
        ).join('')
        const html = `<style>
          body{font-family:system-ui,sans-serif;padding:12px;background:transparent;color:#e2e8f0}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{text-align:center;padding:6px 4px;border-bottom:2px solid #334155;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase}
          th.team-h{text-align:left}
          td{text-align:center;padding:5px 4px;border-bottom:1px solid #1e293b}
          td.team{text-align:left;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
          td.pts{font-weight:700;color:#38bdf8}
          tr:hover td{background:#1e293b}
        </style>
        <table>
          <thead><tr><th>#</th><th class="team-h">Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
        const { id } = await canvasApi('POST', '/api/canvas/widget', {
          widgetType: '@whiteboard/html',
          width: 480, height: 600,
          label: leagueLabel(league),
          settings: { html, title: leagueLabel(league) },
        })
        return `Displayed ${leagueLabel(league)} table (widget id: ${id})`
      }

      return JSON.stringify(table)
    }

    case 'web_search': {
      const braveKey = process.env.VITE_BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_SEARCH_API_KEY
                    ?? process.env.VITE_BING_SEARCH_API_KEY  ?? process.env.BING_SEARCH_API_KEY
      if (!braveKey) return 'Web search unavailable: BRAVE_SEARCH_API_KEY not set'
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=5`,
        { headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey } },
      )
      const body = await r.text()
      console.log(`[brave] status=${r.status} body=${body.slice(0, 300)}`)
      if (!r.ok) return `Search failed: ${r.status} — ${body.slice(0, 200)}`
      const data = JSON.parse(body) as any
      const results = (data.web?.results ?? []).map((v: any) => ({
        title:   v.title,
        snippet: v.description,
        url:     v.url,
      }))
      return JSON.stringify(results)
    }

    case 'fetch_page': {
      try {
        const r = await fetch(input.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Walli/1.0)' },
        })
        if (!r.ok) return `Failed to fetch page: ${r.status}`
        const html = await r.text()
        // Strip tags, collapse whitespace, truncate to ~4000 chars
        const raw = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        // Cut at last sentence boundary within 5000 chars
        const limit = 5000
        const text = raw.length <= limit ? raw : raw.slice(0, limit).replace(/[^.!?]*$/, '')
        return text
      } catch (e) {
        return `Could not fetch page: ${String(e)}`
      }
    }

    case 'open_url': {
      const { url, title, widgetId } = input as { url: string; title?: string; widgetId?: string }
      const settings = { url, title: title ?? '' }
      if (widgetId) {
        await canvasApi('PATCH', `/api/canvas/widget/${widgetId}`, { settings })
        return `Updated website widget to ${url}`
      }
      const { id } = await canvasApi('POST', '/api/canvas/widget', {
        widgetType: '@whiteboard/url',
        width: 800, height: 540,
        label: title ?? 'Website',
        settings,
      })
      return `Created website widget for ${url} (id: ${id})`
    }

    case 'spotify_control': {
      const { action } = input as { action: string }
      const port = Number(process.env.PORT) || 3001

      if (action === 'now_playing') {
        const token = await getSpotifyAccessToken()
        if (!token) return 'Spotify is not connected.'
        const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (r.status === 204) return 'Nothing is currently playing on Spotify.'
        const data = await r.json() as any
        if (!data?.item) return 'Nothing is currently playing.'
        return `${data.item.name} by ${data.item.artists?.map((a: any) => a.name).join(', ')}, ${data.is_playing ? 'playing' : 'paused'}.`
      }

      const r = await fetch(`http://localhost:${port}/api/spotify/${action}`, { method: 'POST' })
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as any
        if (r.status === 401) return 'Spotify is not connected. Open the Spotify widget settings to connect.'
        return `Spotify error: ${err.error ?? r.status}`
      }
      const labels: Record<string, string> = { play: 'Resuming.', pause: 'Paused.', next: 'Skipped.', previous: 'Going back.' }
      return labels[action] ?? 'Done.'
    }

    case 'read_notion_items': {
      const { databaseId, statusFilter, limit = 10 } = input as { databaseId: string; statusFilter?: string; limit?: number }
      try {
        // Fetch the schema to find the title and status/checkbox fields
        const props = await getCachedSchema(databaseId)
        const titleProp    = props.find((p) => p.type === 'title')
        const statusProp   = props.find((p) => p.type === 'status' || p.type === 'select')
        const checkboxProp = props.find((p) => p.type === 'checkbox')

        // Build a filter to exclude done/completed items
        let filter: any = undefined
        if (statusFilter && statusProp) {
          filter = { property: statusProp.name, [statusProp.type]: { equals: statusFilter } }
        } else if (statusProp) {
          const doneOptions = ['Done', 'Completed', 'Complete', 'Closed', 'Archived']
          const doneOption  = (statusProp.options ?? []).find((o: string) => doneOptions.includes(o))
          if (doneOption) {
            filter = { property: statusProp.name, [statusProp.type]: { does_not_equal: doneOption } }
          }
        } else if (checkboxProp) {
          filter = { property: checkboxProp.name, checkbox: { equals: false } }
        }

        const response = await notion.databases.query({
          database_id: databaseId,
          filter,
          page_size: limit,
        })

        const titleKey = titleProp?.name ?? 'Name'
        const items = (response.results as any[]).map((page: any) => {
          const titleArr = page.properties?.[titleKey]?.title as any[]
          return titleArr?.map((t: any) => t.plain_text).join('') ?? '(untitled)'
        }).filter(Boolean)

        if (!items.length) return 'No items found.'
        return items.map((t, i) => `${i + 1}. ${t}`).join('. ')
      } catch (e: any) {
        return `Failed to read items: ${e.message}`
      }
    }

    case 'search_youtube': {
      const port   = Number(process.env.PORT) || 3001
      const result = await fetch(`http://localhost:${port}/api/youtube/search?q=${encodeURIComponent(input.query)}`)
        .then((r) => r.json()) as { videoId?: string; title?: string; error?: string }
      if (result.error) return `YouTube search failed: ${result.error}`
      if (!result.videoId) return `No video found for "${input.query}"`

      const settings = { videoId: result.videoId, title: result.title ?? '' }

      if (input.widgetId) {
        await canvasApi('PATCH', `/api/canvas/widget/${input.widgetId}`, { settings })
        return `Now playing: ${result.title}`
      }

      const { id } = await canvasApi('POST', '/api/canvas/widget', {
        widgetType: '@whiteboard/youtube',
        width: 560, height: 360,
        label: 'YouTube',
        settings,
      })
      return `Created YouTube widget playing: ${result.title} (id: ${id})`
    }

    default:
      return `Unknown tool: ${name}`
  }
}

app.post('/api/voice', async (req, res) => {
  const { text, history = [] } = req.body as { text?: string; history?: { role: string; content: string }[] }
  if (!text?.trim()) return res.json({ response: '' })

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })

  try {
    const anthropic = new Anthropic({ apiKey })

    // Build messages from conversation history + current turn.
    // History alternates user/assistant — Anthropic requires strict alternation.
    const priorMessages: Anthropic.MessageParam[] = history
      .filter((h) => h.role === 'user' || h.role === 'assistant')
      .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content }))

    const messages: Anthropic.MessageParam[] = [
      ...priorMessages,
      { role: 'user', content: text.trim() },
    ]

    let finalText = 'Done.'

    // Agentic loop — up to 8 turns to handle multi-step commands
    for (let turn = 0; turn < 8; turn++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [
          `You are Walli, an intelligent voice assistant for a smart whiteboard wall display. Your responses are spoken aloud.${memoryToPrompt(loadMemory())}${getBoardSnapshot()}`,
          'You can control the whiteboard AND answer general questions, look up live information, and help with anything the user asks. When you learn something new about the user (name, location, preference, or a Notion database they use), call update_memory immediately to remember it for future conversations.',
          'For league standings and table positions always use get_standings — it returns live data directly from ESPN. For other live data (news, weather, scores, etc.) use web_search to find relevant URLs, then fetch_page on the best result to read the actual content before answering.',
          'Always use get_board_state first if you need to find a widget ID or database ID. Notion view widgets (type @whiteboard/notion-view) store their database ID at widget.settings.databaseId — read it directly from the board state instead of calling list_notion_databases. Known databases are also listed in your memory above, so if the user references a database by name you may already have its ID. When the user says "read me my tasks", "what\'s on my list", or similar, use read_notion_items with the tasks database ID from memory or board state.',
          'For Spotify: use spotify_control for play/pause/skip/previous/now_playing. Spotify must be actively playing on a device for controls to work — if it fails, tell the user to open Spotify on their device first.',
          'When the user asks to "show" something, use open_url with the best URL from your search results or knowledge. Prefer sites known to allow embedding (e.g. flashscore.com, bbc.co.uk, wikipedia.org). Avoid sites that block iframes (google.com, twitter.com, premierleague.com).',
          'When you need more information to complete a task, ask ONE short clarifying question (max 10 words, ending with "?"). The user will answer and you can then complete the task.',
          'When answering a question, summarise the key facts in 1-2 spoken sentences. When confirming an action, ONE short sentence (max 8 words).',
          'Never use markdown, bullet points, or long explanations — responses are spoken aloud.',
          `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
        ].join(' '),
        tools:    VOICE_TOOLS,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        finalText = (textBlock as Anthropic.TextBlock)?.text ?? 'Done.'
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeVoiceTool(block.name, block.input as Record<string, any>)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user',      content: toolResults })
      }
    }

    res.json({ response: finalText })
  } catch (error: any) {
    console.error('Voice API error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

app.post('/api/tts', async (req, res) => {
  const { text } = req.body as { text?: string }
  if (!text?.trim()) return res.status(400).json({ error: 'No text' })

  const apiKey = process.env.VITE_ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not set' })

  const voiceId = process.env.VITE_ELEVENLABS_VOICE_ID ?? process.env.ELEVENLABS_VOICE_ID ?? 'SOYHLrjzK2X1ezoPC6cr'

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.85, similarity_boost: 0.6, style: 0, use_speaker_boost: true },
      }),
    })
    if (!r.ok) {
      const err = await r.text()
      return res.status(r.status).json({ error: err })
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')
    const { Readable } = await import('stream')
    Readable.fromWeb(r.body as any).pipe(res)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ── Quote ─────────────────────────────────────────────────────────────────────

const QUOTES: { quote: string; author: string }[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src/components/config/quotes.config.json'), 'utf-8')
)

app.get('/api/quote', (_req, res) => {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  res.json(q)
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001
httpServer.listen(PORT, () => {
  console.log(`\n🗂  Smart Whiteboard server running on http://localhost:${PORT}`)
  if (!process.env.NOTION_API_KEY)  console.warn('⚠️  NOTION_API_KEY not set')
  else                              console.log('✅  Notion API key loaded')
  const gcalTokens = loadTokens()
  if (gcalTokens?.refresh_token || gcalTokens?.access_token) console.log('✅  Google Calendar authenticated')
  else console.log('   Google Calendar: connect via Settings panel')
  const spotifyTokens = loadTokens()
  if (spotifyTokens?.spotify_refresh_token || spotifyTokens?.spotify_access_token)
    console.log('✅  Spotify authenticated')
  else
    console.log('   Spotify: connect via the widget settings panel')
})
