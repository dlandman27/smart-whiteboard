import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import { supabaseAdmin } from './lib/supabase.js'
import { agentEvents } from './agents/scheduler.js'

export let wss: WebSocketServer

export const browserClients = new Set<WebSocket>()

// ── Active board (transient session UI state, not persisted) ──────────────────
// Boards/widgets/theme/slots all live in Supabase as the source of truth — query
// them via supabaseAdmin in the route handlers, not from this module.
// activeBoardId is the only thing kept in memory because it's "which board is
// the kiosk currently displaying" — a per-session UI focus, not a persisted fact.

let cachedActiveBoardId = ''
export function getActiveBoardId() { return cachedActiveBoardId }
export function setActiveBoardId(id: string) { cachedActiveBoardId = id }

// ── DEPRECATED in-memory accessors ────────────────────────────────────────────
// These were populated by the browser sending state_update. The server now reads
// boards/widgets/theme from Supabase directly. These stubs exist so legacy
// callers (voice-tools, board-utils, crons) compile; they return empty data.
// TODO: migrate callers to query Supabase directly (or via a shared helper).

const EMPTY_CANVAS = { width: 1920, height: 1080 }
export function getWidgets(): unknown[] { return [] }
export function getCanvas() { return EMPTY_CANVAS }
export function getBoards(): { id: string; name: string; widgets: unknown[] }[] { return [] }
export function getSlots(): unknown[] { return [] }
export function setSlots(_slots: unknown[]) { /* no-op — slots persist on the board row */ }
export function getTheme() { return { themeId: null as string | null, vars: undefined, background: undefined } }
export function setTheme(_t: unknown) { /* no-op — theme persists in user_theme */ }

// ── Board event ring buffer ───────────────────────────────────────────────────

interface BoardEvent { type: string; ts: number; [key: string]: unknown }
const boardEventRing: BoardEvent[] = []
const MAX_BOARD_EVENTS = 200

export function recordBoardEvent(evt: Omit<BoardEvent, 'ts'>) {
  boardEventRing.push({ ...evt, ts: Date.now() } as BoardEvent)
  if (boardEventRing.length > MAX_BOARD_EVENTS) boardEventRing.shift()
}

export function getBoardEvents(since?: number): BoardEvent[] {
  return since == null ? [...boardEventRing] : boardEventRing.filter((e) => e.ts > since)
}

export function broadcast(msg: object) {
  const payload = JSON.stringify(msg)
  for (const client of browserClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

async function verifyWsToken(req: IncomingMessage): Promise<string | null> {
  try {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')
    if (!token) return null
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}

export function initWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', async (ws, req) => {
    const userId = await verifyWsToken(req)
    if (!userId) {
      ws.close(4001, 'Unauthorized')
      return
    }

    browserClients.add(ws)
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        // We no longer accept state_update — the server reads from Supabase.
        // The browser may still send these for backward compat; ignore the payload
        // but track the activeBoardId since that's the one piece of session UI state.
        if (msg.type === 'state_update' && typeof msg.activeBoardId === 'string') {
          cachedActiveBoardId = msg.activeBoardId
        }
        // Notification messages from the browser (when the user takes UI actions
        // not driven by HTTP). These mirror events recorded by the route handlers
        // when MCP is the actor; here they capture browser-originated actions.
        if (msg.type === 'board_switched') {
          if (msg.boardType) agentEvents.emit('board_opened', msg.boardType)
          if (msg.boardId)   cachedActiveBoardId = msg.boardId
          recordBoardEvent({ type: 'board_switched', boardId: msg.boardId, boardName: msg.boardName })
        }
        if (msg.type === 'widget_added') {
          if (msg.widgetType) agentEvents.emit('widget_added', msg.widgetType)
          recordBoardEvent({ type: 'widget_added', widgetType: msg.widgetType, widgetId: msg.widgetId })
        }
        if (msg.type === 'widget_focused') {
          recordBoardEvent({ type: 'widget_focused', widgetId: msg.widgetId ?? null })
        }
      } catch { /* ignore */ }
    })
    ws.on('close', () => browserClients.delete(ws))
  })
}
