import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock classes (vi.hoisted runs before imports) ────────────────────
const { MockWebSocket, MockWebSocketServer } = vi.hoisted(() => {
  // EventEmitter must be required here since imports aren't available yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter } = require('events') as typeof import('events')

  class MockWebSocket extends EventEmitter {
    readyState: number
    sentMessages: string[] = []
    closeCode?: number
    closeReason?: string

    static OPEN    = 1
    static CLOSING = 2
    static CLOSED  = 3

    constructor() {
      super()
      this.readyState = (MockWebSocket as any).OPEN
    }

    send(data: string) { this.sentMessages.push(data) }
    close(code?: number, reason?: string) {
      this.closeCode   = code
      this.closeReason = reason
      this.readyState  = (MockWebSocket as any).CLOSED
    }
  }
  // Mirror static values so instance code can read them
  ;(MockWebSocket as any).OPEN    = 1
  ;(MockWebSocket as any).CLOSING = 2
  ;(MockWebSocket as any).CLOSED  = 3

  class MockWebSocketServer extends EventEmitter {
    constructor(_opts: any) { super() }
  }

  return { MockWebSocket, MockWebSocketServer }
})

vi.mock('ws', () => ({
  WebSocketServer: MockWebSocketServer,
  WebSocket:       MockWebSocket,
}))

// ── Mock: supabase ───────────────────────────────────────────────────────────
vi.mock('./lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
  },
}))

import { EventEmitter } from 'events'
import { supabaseAdmin } from './lib/supabase.js'
import {
  initWebSocket,
  broadcast,
  browserClients,
  wss,
} from './ws.js'

const mockGetUser = supabaseAdmin.auth.getUser as ReturnType<typeof vi.fn>

// Helper: emit a 'connection' event and wait for the async handler to finish.
async function simulateConnection(
  ws: InstanceType<typeof MockWebSocket>,
  req: { url: string },
  authorised = true,
) {
  if (authorised) {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
  } else {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad token' } })
  }

  const server = wss as unknown as EventEmitter
  server.emit('connection', ws, req)
  await new Promise(r => setImmediate(r))
  await new Promise(r => setImmediate(r))
}

// ──────────────────────────────────────────────────────────────────────────────
describe('initWebSocket', () => {
  beforeEach(() => {
    browserClients.clear()
    mockGetUser.mockReset()
  })

  it('creates a WebSocketServer bound to the http server', () => {
    initWebSocket({} as any)
    expect(wss).toBeInstanceOf(MockWebSocketServer)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('broadcast', () => {
  beforeEach(() => {
    browserClients.clear()
    mockGetUser.mockReset()
    initWebSocket({} as any)
  })

  it('sends a JSON payload to all OPEN clients', () => {
    const c1 = new MockWebSocket()
    const c2 = new MockWebSocket()
    browserClients.add(c1 as any)
    browserClients.add(c2 as any)

    broadcast({ type: 'ping' })

    expect(c1.sentMessages).toEqual([JSON.stringify({ type: 'ping' })])
    expect(c2.sentMessages).toEqual([JSON.stringify({ type: 'ping' })])
  })

  it('skips clients that are not OPEN', () => {
    const openClient   = new MockWebSocket()
    const closedClient = new MockWebSocket()
    closedClient.readyState = 3 // CLOSED

    browserClients.add(openClient   as any)
    browserClients.add(closedClient as any)

    broadcast({ type: 'hello' })

    expect(openClient.sentMessages).toHaveLength(1)
    expect(closedClient.sentMessages).toHaveLength(0)
  })

  it('does not throw when there are no clients', () => {
    expect(() => broadcast({ type: 'empty' })).not.toThrow()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('connection handling', () => {
  beforeEach(() => {
    browserClients.clear()
    mockGetUser.mockReset()
    initWebSocket({} as any)
  })

  it('adds an authorised client to browserClients', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=valid-token' }, true)
    expect(browserClients.has(ws as any)).toBe(true)
  })

  it('closes the socket with code 4001 for an unauthorised client', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=bad-token' }, false)
    expect(browserClients.has(ws as any)).toBe(false)
    expect(ws.closeCode).toBe(4001)
  })

  it('closes the socket when no token is provided', async () => {
    // verifyWsToken returns null when searchParams has no token
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const ws = new MockWebSocket()
    const server = wss as unknown as EventEmitter
    server.emit('connection', ws, { url: '/' })
    await new Promise(r => setImmediate(r))
    await new Promise(r => setImmediate(r))
    expect(browserClients.has(ws as any)).toBe(false)
  })

  it('removes a client from browserClients on disconnect', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=valid' }, true)
    expect(browserClients.has(ws as any)).toBe(true)

    ws.emit('close')
    expect(browserClients.has(ws as any)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
describe('message routing', () => {
  beforeEach(() => {
    browserClients.clear()
    mockGetUser.mockReset()
    initWebSocket({} as any)
  })

  it('updates cached state on a state_update message', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=t' }, true)

    const msg = {
      type:          'state_update',
      widgets:       [{ id: 'w1' }],
      boards:        [{ id: 'b1', name: 'Board 1', widgets: [] }],
      activeBoardId: 'b1',
      canvas:        { width: 2560, height: 1440 },
    }

    ws.emit('message', Buffer.from(JSON.stringify(msg)))

    const wsModule = await import('./ws.js')
    expect(wsModule.cachedWidgets).toEqual([{ id: 'w1' }])
    expect(wsModule.cachedBoards).toEqual([{ id: 'b1', name: 'Board 1', widgets: [] }])
    expect(wsModule.cachedActiveBoardId).toBe('b1')
    expect(wsModule.cachedCanvas).toEqual({ width: 2560, height: 1440 })
  })

  it('ignores malformed (non-JSON) messages without throwing', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=t' }, true)
    expect(() => ws.emit('message', Buffer.from('not json'))).not.toThrow()
  })

  it('ignores unknown message types without throwing', async () => {
    const ws = new MockWebSocket()
    await simulateConnection(ws, { url: '/?token=t' }, true)
    expect(() =>
      ws.emit('message', Buffer.from(JSON.stringify({ type: 'unknown' })))
    ).not.toThrow()
  })
})
