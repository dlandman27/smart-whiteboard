import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

export let wss: WebSocketServer

export const browserClients = new Set<WebSocket>()
export let cachedWidgets: unknown[] = []
export let cachedCanvas: { width: number; height: number } = { width: 1920, height: 1080 }
export let cachedBoards: { id: string; name: string; widgets: unknown[] }[] = []
export let cachedActiveBoardId = ''

export function getBoards() { return cachedBoards }
export function getActiveBoardId() { return cachedActiveBoardId }
export function getWidgets() { return cachedWidgets }
export function getCanvas() { return cachedCanvas }

export function broadcast(msg: object) {
  const payload = JSON.stringify(msg)
  for (const client of browserClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload)
  }
}

export function initWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws) => {
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
      } catch { /* ignore */ }
    })
    ws.on('close', () => browserClients.delete(ws))
  })
}
