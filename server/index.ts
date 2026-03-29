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
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
}

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

const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state'

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
  const { text } = req.body as { text?: string }
  if (!text?.trim()) return res.json({ response: '' })

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })

  try {
    const anthropic = new Anthropic({ apiKey })
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: text.trim() },
    ]

    let finalText = 'Done.'

    // Agentic loop — up to 5 turns to handle multi-step commands
    for (let turn = 0; turn < 5; turn++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: [
          'You are a voice assistant for a smart whiteboard wall display.',
          'The user speaks commands and you execute them using tools.',
          'Always use get_board_state first if you need to find a widget ID or database ID.',
          'Reply with ONE short sentence (max 8 words) confirming what you did.',
          'Do not explain, just confirm. Example: "Added milk to your grocery list."',
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
