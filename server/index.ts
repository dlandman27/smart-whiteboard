import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { Client } from '@notionhq/client'
import Anthropic from '@anthropic-ai/sdk'
import { createScheduler, readUserAgents, buildDynamicAgent } from './agents/index.js'

import { initWebSocket, broadcast } from './ws.js'
import { loadTokens } from './services/tokens.js'
import { loggedNotify } from './services/notify.js'
import { getGCalClient } from './services/gcal.js'
import { getBoards, getActiveBoardId } from './ws.js'

import { canvasRouter }        from './routes/canvas.js'
import { boardsRouter }        from './routes/boards.js'
import { notionRouter }        from './routes/notion.js'
import { gcalRouter }          from './routes/gcal.js'
import { spotifyRouter }       from './routes/spotify.js'
import { sportsRouter }        from './routes/sports.js'
import { youtubeRouter }       from './routes/youtube.js'
import { voiceRouter }         from './routes/voice.js'
import { briefingRouter }      from './routes/briefing.js'
import { notificationsRouter } from './routes/notifications.js'
import { agentsRouter }        from './routes/agents.js'
import { miscRouter }          from './routes/misc.js'
import { walliRouter }         from './routes/walli.js'

import { startAllCrons } from './crons/index.js'
import { errorMiddleware } from './middleware/error.js'
import { log, warn } from './lib/logger.js'

const app        = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ── WebSocket ──────────────────────────────────────────────────────────────────

initWebSocket(httpServer)

// ── Clients ────────────────────────────────────────────────────────────────────

const notion    = new Client({ auth: process.env.NOTION_API_KEY })
const anthropic = new Anthropic()

// ── Routes ─────────────────────────────────────────────────────────────────────

app.use('/api', canvasRouter())
app.use('/api', boardsRouter())
app.use('/api', notionRouter(notion))
app.use('/api', gcalRouter())
app.use('/api', spotifyRouter())
app.use('/api', sportsRouter())
app.use('/api', youtubeRouter())
app.use('/api', voiceRouter(notion))
app.use('/api', briefingRouter(notion))
app.use('/api', notificationsRouter())
app.use('/api', miscRouter())

// ── Agent scheduler ────────────────────────────────────────────────────────────

const agentScheduler = createScheduler({
  broadcast:  (msg) => broadcast(msg),
  speak:      (text) => broadcast({ type: 'speak_briefing', text, id: crypto.randomUUID() }),
  notify:     loggedNotify,
  notion,
  anthropic,
  get gcal()          { return getGCalClient() },
  get boards()        { return getBoards() },
  get activeBoardId() { return getActiveBoardId() },
})

app.use('/api', agentsRouter(agentScheduler))
app.use('/api', walliRouter())

// Load persisted user-defined agents
for (const def of readUserAgents()) {
  agentScheduler.register(buildDynamicAgent(def))
}

// ── Error handling (must be last middleware) ───────────────────────────────────

app.use(errorMiddleware)

// ── Serve frontend in production ───────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath  = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// ── Crons ──────────────────────────────────────────────────────────────────────

startAllCrons(notion)

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3001
httpServer.listen(PORT, () => {
  log(`Smart Whiteboard server running on http://localhost:${PORT}`)
  if (!process.env.NOTION_API_KEY) warn('NOTION_API_KEY not set')
  else                             log('Notion API key loaded')
  const gcalTokens = loadTokens()
  if (gcalTokens?.refresh_token || gcalTokens?.access_token) log('Google Calendar authenticated')
  else log('Google Calendar: connect via Settings panel')
  if (gcalTokens?.spotify_refresh_token || gcalTokens?.spotify_access_token) log('Spotify authenticated')
  else log('Spotify: connect via the widget settings panel')
  agentScheduler.start()
})
