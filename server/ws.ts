import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import { supabaseAdmin } from './lib/supabase.js'
import { agentEvents } from './agents/scheduler.js'

export let wss: WebSocketServer

export const browserClients = new Set<WebSocket>()
export let cachedWidgets: unknown[] = []
export let cachedCanvas: { width: number; height: number } = { width: 1920, height: 1080 }
export let cachedBoards: { id: string; name: string; widgets: unknown[] }[] = []
export let cachedActiveBoardId = ''
export let cachedSlots: unknown[] = []

export function getBoards() { return cachedBoards }
export function getActiveBoardId() { return cachedActiveBoardId }
export function getWidgets() { return cachedWidgets }
export function getCanvas() { return cachedCanvas }
export function getSlots() { return cachedSlots }
export function setSlots(slots: unknown[]) { cachedSlots = slots }

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
        if (msg.type === 'state_update') {
          cachedWidgets       = msg.widgets ?? []
          cachedBoards        = msg.boards  ?? []
          cachedActiveBoardId = msg.activeBoardId ?? ''
          if (msg.canvas) cachedCanvas = msg.canvas
        }
        if (msg.type === 'board_switched') {
          if (msg.boardType) agentEvents.emit('board_opened', msg.boardType)
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
