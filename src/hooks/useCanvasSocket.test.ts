import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ── Store action mocks (stable fns reused across tests) ────────────────────────

const addWidget       = vi.fn()
const updateLayout    = vi.fn()
const updateSettings  = vi.fn()
const removeWidget    = vi.fn()
const clearWidgets    = vi.fn()
const addBoard        = vi.fn()
const renameBoard     = vi.fn()
const removeBoard     = vi.fn()
const setActiveBoard  = vi.fn()
const setCustomLayout = vi.fn()

const setFocusedWidget   = vi.fn()
const flashWidget        = vi.fn()
const setScreensaverMode = vi.fn()

const setTheme       = vi.fn()
const setCustomTheme = vi.fn()

const trigger = vi.fn()

const addNotification = vi.fn()

const setPet = vi.fn()

const setWidget = vi.fn()

// ── Mock all stores ────────────────────────────────────────────────────────────

vi.mock('../store/whiteboard', () => ({
  useWhiteboardStore: {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}))

vi.mock('../store/ui', () => ({
  useUIStore: { getState: vi.fn() },
}))

vi.mock('../store/theme', () => ({
  useThemeStore: { getState: vi.fn() },
}))

vi.mock('../store/briefing', () => ({
  useBriefingStore: { getState: vi.fn() },
}))

vi.mock('../store/notifications', () => ({
  useNotificationStore: { getState: vi.fn() },
}))

vi.mock('../store/pets', () => ({
  usePetsStore: { getState: vi.fn() },
}))

vi.mock('../store/walliAgents', () => ({
  useWalliAgentsStore: { getState: vi.fn() },
}))

vi.mock('../lib/sounds', () => ({
  soundWidgetAdded:   vi.fn(),
  soundWidgetRemoved: vi.fn(),
}))

vi.mock('../App', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}))

// supabase is globally mocked in setup.ts
import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { useThemeStore } from '../store/theme'
import { useBriefingStore } from '../store/briefing'
import { useNotificationStore } from '../store/notifications'
import { usePetsStore } from '../store/pets'
import { useWalliAgentsStore } from '../store/walliAgents'

// ── Mock WebSocket ─────────────────────────────────────────────────────────────

class MockWebSocket {
  static OPEN = 1
  readyState = MockWebSocket.OPEN
  onopen:    ((e: any) => void) | null = null
  onmessage: ((e: any) => void) | null = null
  onclose:   ((e: any) => void) | null = null
  onerror:   ((e: any) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: string) { this.sent.push(data) }
  close() { this.onclose?.({ code: 1000 }) }

  static instances: MockWebSocket[] = []
  static reset() { MockWebSocket.instances = [] }
}

vi.stubGlobal('WebSocket', MockWebSocket)

import { useCanvasSocket } from './useCanvasSocket'

// ── Setup store return values ──────────────────────────────────────────────────

function setupStoreMocks() {
  vi.mocked(useWhiteboardStore.getState).mockReturnValue({
    boards: [{ id: 'board-1', name: 'Main', widgets: [] }],
    activeBoardId: 'board-1',
    addWidget, updateLayout, updateSettings, removeWidget, clearWidgets,
    addBoard, renameBoard, removeBoard, setActiveBoard, setCustomLayout,
  } as any)

  vi.mocked(useUIStore.getState).mockReturnValue({
    setFocusedWidget, flashWidget, setScreensaverMode,
  } as any)

  vi.mocked(useThemeStore.getState).mockReturnValue({
    setTheme, setCustomTheme,
  } as any)

  vi.mocked(useBriefingStore.getState).mockReturnValue({
    trigger,
  } as any)

  vi.mocked(useNotificationStore.getState).mockReturnValue({
    addNotification,
  } as any)

  vi.mocked(usePetsStore.getState).mockReturnValue({
    setPet, pets: {},
  } as any)

  vi.mocked(useWalliAgentsStore.getState).mockReturnValue({
    setWidget,
  } as any)
}

describe('useCanvasSocket', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    vi.clearAllMocks()
    setupStoreMocks()
    // Default: authenticated session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-token' } as any },
    } as any)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('does not create WebSocket when session is null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)

    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('creates a WebSocket with the token in the URL', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toContain('test-token')
  })

  it('sends state_update on open', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]
    ws.onopen?.(null)
    expect(ws.sent.length).toBeGreaterThan(0)
    const msg = JSON.parse(ws.sent[0])
    expect(msg.type).toBe('state_update')
  })

  it('handles create_widget message', async () => {
    const { soundWidgetAdded } = await import('../lib/sounds')
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'create_widget', id: 'w-1', widgetType: 'clock', x: 100, y: 100, width: 300, height: 200 }) })

    expect(soundWidgetAdded).toHaveBeenCalled()
    expect(addWidget).toHaveBeenCalled()
  })

  it('handles delete_widget message', async () => {
    const { soundWidgetRemoved } = await import('../lib/sounds')
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'delete_widget', id: 'w-1' }) })

    expect(soundWidgetRemoved).toHaveBeenCalled()
    expect(removeWidget).toHaveBeenCalledWith('w-1')
  })

  it('handles set_theme message', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'set_theme', themeId: 'dark' }) })

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('handles speak_briefing message', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'speak_briefing', text: 'Good morning!', id: 'speak-1' }) })

    expect(trigger).toHaveBeenCalledWith('Good morning!')
  })

  it('ignores malformed JSON messages', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    expect(() => ws.onmessage?.({ data: 'not-json' })).not.toThrow()
  })

  it('closes WebSocket on unmount', async () => {
    const { unmount } = renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]
    const closeSpy = vi.spyOn(ws, 'close')
    unmount()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('handles timer_alert message', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'timer_alert', label: 'Pizza Timer' }) })

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Timer done' })
    )
  })

  it('handles set_screensaver message', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'set_screensaver', active: true }) })

    expect(setScreensaverMode).toHaveBeenCalledWith(true)
  })

  it('handles update_widget with layout changes', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'update_widget', id: 'w-1', x: 50, y: 60 }) })

    expect(updateLayout).toHaveBeenCalledWith('w-1', expect.objectContaining({ x: 50, y: 60 }))
  })

  it('handles clear_widgets message', async () => {
    renderHook(() => useCanvasSocket())
    await new Promise((r) => setTimeout(r, 10))
    const ws = MockWebSocket.instances[0]

    ws.onmessage?.({ data: JSON.stringify({ type: 'clear_widgets' }) })

    expect(clearWidgets).toHaveBeenCalled()
  })
})
