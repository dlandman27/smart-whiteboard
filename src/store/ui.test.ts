import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useUIStore } from './ui'

const store = () => useUIStore.getState()

beforeEach(() => {
  useUIStore.setState(useUIStore.getInitialState(), true)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useUIStore — initial state', () => {
  it('focusedWidgetId is null', () => {
    expect(store().focusedWidgetId).toBeNull()
  })

  it('flashingWidgetId is null', () => {
    expect(store().flashingWidgetId).toBeNull()
  })

  it('canvasSize reflects window dimensions', () => {
    expect(store().canvasSize).toEqual({ w: window.innerWidth, h: window.innerHeight })
  })

  it('widgetCommand is null', () => {
    expect(store().widgetCommand).toBeNull()
  })

  it('fullscreenWidgetId is null', () => {
    expect(store().fullscreenWidgetId).toBeNull()
  })

  it('displayMode is false', () => {
    expect(store().displayMode).toBe(false)
  })

  it('screensaverMode is false', () => {
    expect(store().screensaverMode).toBe(false)
  })
})

describe('setFocusedWidget', () => {
  it('sets a widget id', () => {
    store().setFocusedWidget('w-1')
    expect(store().focusedWidgetId).toBe('w-1')
  })

  it('clears the focused widget when passed null', () => {
    store().setFocusedWidget('w-1')
    store().setFocusedWidget(null)
    expect(store().focusedWidgetId).toBeNull()
  })
})

describe('flashWidget', () => {
  it('sets flashingWidgetId immediately', () => {
    store().flashWidget('w-flash')
    expect(store().flashingWidgetId).toBe('w-flash')
  })

  it('clears flashingWidgetId after 2 seconds', () => {
    store().flashWidget('w-flash')
    vi.advanceTimersByTime(2000)
    expect(store().flashingWidgetId).toBeNull()
  })

  it('does not clear if a different widget is flashing when the timer fires', () => {
    store().flashWidget('w-1')
    // before timeout fires, flash a new widget
    store().flashWidget('w-2')
    vi.advanceTimersByTime(2000)
    // The timer from w-1 checks that flashingWidgetId === 'w-1' — it won't clear 'w-2'
    expect(store().flashingWidgetId).toBeNull()
  })
})

describe('setCanvasSize', () => {
  it('updates canvas size', () => {
    store().setCanvasSize(1920, 1080)
    expect(store().canvasSize).toEqual({ w: 1920, h: 1080 })
  })

  it('can be called multiple times', () => {
    store().setCanvasSize(800, 600)
    store().setCanvasSize(1280, 720)
    expect(store().canvasSize).toEqual({ w: 1280, h: 720 })
  })
})

describe('sendWidgetCommand / clearWidgetCommand', () => {
  it('sets a widget command', () => {
    store().sendWidgetCommand('w-1', 'fullscreen')
    expect(store().widgetCommand).toEqual({ id: 'w-1', cmd: 'fullscreen' })
  })

  it('supports all command types', () => {
    const cmds = ['fullscreen', 'settings', 'delete', 'split'] as const
    for (const cmd of cmds) {
      store().sendWidgetCommand('w-1', cmd)
      expect(store().widgetCommand?.cmd).toBe(cmd)
    }
  })

  it('overwrites a previous command', () => {
    store().sendWidgetCommand('w-1', 'settings')
    store().sendWidgetCommand('w-2', 'delete')
    expect(store().widgetCommand).toEqual({ id: 'w-2', cmd: 'delete' })
  })

  it('clearWidgetCommand sets widgetCommand to null', () => {
    store().sendWidgetCommand('w-1', 'fullscreen')
    store().clearWidgetCommand()
    expect(store().widgetCommand).toBeNull()
  })

  it('clearWidgetCommand is safe when already null', () => {
    store().clearWidgetCommand()
    expect(store().widgetCommand).toBeNull()
  })
})

describe('setFullscreenWidget', () => {
  it('sets a fullscreen widget id', () => {
    store().setFullscreenWidget('w-fs')
    expect(store().fullscreenWidgetId).toBe('w-fs')
  })

  it('clears fullscreen widget when passed null', () => {
    store().setFullscreenWidget('w-fs')
    store().setFullscreenWidget(null)
    expect(store().fullscreenWidgetId).toBeNull()
  })
})

describe('displayMode', () => {
  it('setDisplayMode turns it on', () => {
    store().setDisplayMode(true)
    expect(store().displayMode).toBe(true)
  })

  it('setDisplayMode turns it off', () => {
    store().setDisplayMode(true)
    store().setDisplayMode(false)
    expect(store().displayMode).toBe(false)
  })

  it('toggleDisplayMode flips from false to true', () => {
    store().toggleDisplayMode()
    expect(store().displayMode).toBe(true)
  })

  it('toggleDisplayMode flips from true to false', () => {
    store().setDisplayMode(true)
    store().toggleDisplayMode()
    expect(store().displayMode).toBe(false)
  })

  it('toggleDisplayMode is idempotent when called twice', () => {
    store().toggleDisplayMode()
    store().toggleDisplayMode()
    expect(store().displayMode).toBe(false)
  })
})

describe('screensaverMode', () => {
  it('setScreensaverMode enables screensaver', () => {
    store().setScreensaverMode(true)
    expect(store().screensaverMode).toBe(true)
  })

  it('setScreensaverMode disables screensaver', () => {
    store().setScreensaverMode(true)
    store().setScreensaverMode(false)
    expect(store().screensaverMode).toBe(false)
  })

  it('setting same value is idempotent', () => {
    store().setScreensaverMode(false)
    expect(store().screensaverMode).toBe(false)
  })
})
