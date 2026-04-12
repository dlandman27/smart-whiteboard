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
import { loggedNotify } from './services/notify.js'
import { getGCalClient } from './services/gcal.js'
import { getBoards, getActiveBoardId } from './ws.js'

import { canvasRouter }        from './routes/canvas.js'
import { boardsRouter }        from './routes/boards.js'
import { notionRouter }        from './routes/notion.js'
import { gcalRouter }          from './routes/gcal.js'
import { gtasksRouter }        from './routes/gtasks.js'
import { spotifyRouter }       from './routes/spotify.js'
import { sportsRouter }        from './routes/sports.js'
import { youtubeRouter }       from './routes/youtube.js'
import { voiceRouter }         from './routes/voice.js'
import { briefingRouter }      from './routes/briefing.js'
import { notificationsRouter } from './routes/notifications.js'
import { agentsRouter }        from './routes/agents.js'
import { miscRouter }          from './routes/misc.js'
import { walliRouter }         from './routes/walli.js'
import { credentialsRouter }   from './routes/credentials.js'
import { gphotosRouter }       from './routes/gphotos.js'
import { rssRouter }           from './routes/rss.js'
import { stocksRouter }        from './routes/stocks.js'
import { todoistRouter }       from './routes/todoist.js'
import { icalRouter }          from './routes/ical.js'
import { feedbackRouter }      from './routes/feedback.js'
import { tasksRouter }         from './routes/tasks.js'
import { eventsRouter }        from './routes/events.js'

import { startAllCrons } from './crons/index.js'
import rateLimit from 'express-rate-limit'
import { errorMiddleware } from './middleware/error.js'
import { requireAuth }    from './middleware/auth.js'
import { log, warn } from './lib/logger.js'

const app        = express()
const httpServer = createServer(app)

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173',
  'https://localhost',
  'http://localhost:3001',
  'https://smart-whiteboard-production.up.railway.app',
]
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true)
    else callback(new Error('CORS not allowed'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '20mb' }))

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Global: 200 requests per minute per IP
app.use('/api', rateLimit({
  windowMs: 60_000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later' },
}))

// Stricter limit on auth-adjacent routes: 10 per minute
app.use('/api/gcal/connect',       rateLimit({ windowMs: 60_000, max: 10 }))
app.use('/api/todoist/connect',    rateLimit({ windowMs: 60_000, max: 10 }))
app.use('/api/notion/connect',     rateLimit({ windowMs: 60_000, max: 10 }))
app.use('/api/spotify/start-auth', rateLimit({ windowMs: 60_000, max: 10 }))
app.use('/api/credentials',        rateLimit({ windowMs: 60_000, max: 20 }))

// ── WebSocket ──────────────────────────────────────────────────────────────────

initWebSocket(httpServer)

// ── Clients ────────────────────────────────────────────────────────────────────

const notion    = new Client({ auth: process.env.NOTION_API_KEY })
const anthropic = new Anthropic()

// ── Routes (auth applied only to /api) ────────────────────────────────────────

app.use('/api', requireAuth)
app.use('/api', canvasRouter())
app.use('/api', boardsRouter())
app.use('/api', notionRouter())
app.use('/api', gcalRouter())
app.use('/api', gtasksRouter())
app.use('/api', spotifyRouter())
app.use('/api', sportsRouter())
app.use('/api', youtubeRouter())
app.use('/api', voiceRouter())
app.use('/api', briefingRouter())
app.use('/api', notificationsRouter())
app.use('/api', miscRouter())
app.use('/api', credentialsRouter())
app.use('/api', gphotosRouter())
app.use('/api', rssRouter())
app.use('/api', stocksRouter())
app.use('/api', todoistRouter())
app.use('/api', icalRouter())
app.use('/api', feedbackRouter())
app.use('/api', tasksRouter())
app.use('/api', eventsRouter())

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
  log(`Supabase: ${process.env.SUPABASE_URL ? 'connected' : 'NOT configured'}`)
  if (process.env.NOTION_API_KEY) log('Notion API key loaded (global fallback)')
  if (process.env.GOOGLE_CLIENT_ID) log('Google OAuth configured')
  agentScheduler.start()
})
