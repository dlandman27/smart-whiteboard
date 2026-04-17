import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the db module
vi.mock('./db', () => ({
  upsertTheme: vi.fn().mockResolvedValue(undefined),
}))

// Mock the theme store
const themeListeners = new Set<(state: any) => void>()
let themeState = {
  activeThemeId:   'slate',
  customOverrides: {},
  customTheme:     null,
  background:      { label: 'Solid', bg: '#f1f5f9', dot: '#cbd5e1' },
  petsEnabled:     false,
}

vi.mock('../store/theme', () => {
  const mockStore: any = (selector: any) => selector(themeState)
  mockStore.subscribe = (cb: any) => {
    themeListeners.add(cb)
    return () => themeListeners.delete(cb)
  }
  return { useThemeStore: mockStore }
})

import { upsertTheme } from './db'
import { startThemeSync, stopThemeSync } from './syncTheme'

function triggerThemeStore(next: Partial<typeof themeState>) {
  themeState = { ...themeState, ...next }
  themeListeners.forEach((cb) => cb(themeState))
}

describe('startThemeSync / stopThemeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    themeListeners.clear()
    themeState = {
      activeThemeId:   'slate',
      customOverrides: {},
      customTheme:     null,
      background:      { label: 'Solid', bg: '#f1f5f9', dot: '#cbd5e1' },
      petsEnabled:     false,
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    stopThemeSync()
    vi.useRealTimers()
  })

  it('starts syncing without throwing', () => {
    expect(() => startThemeSync('user-1')).not.toThrow()
  })

  it('stopThemeSync without prior start does not throw', () => {
    expect(() => stopThemeSync()).not.toThrow()
  })

  it('debounces upsertTheme on state change', () => {
    startThemeSync('user-1')
    triggerThemeStore({ activeThemeId: 'dracula' })

    // Not called immediately
    expect(upsertTheme).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(upsertTheme).toHaveBeenCalledOnce()
    expect(upsertTheme).toHaveBeenCalledWith('user-1', expect.objectContaining({
      activeThemeId: 'dracula',
    }))
  })

  it('calls upsertTheme with correct shape', () => {
    startThemeSync('user-1')
    triggerThemeStore({ activeThemeId: 'ocean', petsEnabled: true })
    vi.advanceTimersByTime(300)

    expect(upsertTheme).toHaveBeenCalledWith('user-1', {
      activeThemeId:   'ocean',
      customOverrides: {},
      customTheme:     null,
      background:      { label: 'Solid', bg: '#f1f5f9', dot: '#cbd5e1' },
      petsEnabled:     true,
    })
  })

  it('debounces multiple rapid changes into one call', () => {
    startThemeSync('user-1')
    triggerThemeStore({ activeThemeId: 'midnight' })
    triggerThemeStore({ activeThemeId: 'forest' })
    triggerThemeStore({ activeThemeId: 'dracula' })

    expect(upsertTheme).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(upsertTheme).toHaveBeenCalledOnce()
    expect(upsertTheme).toHaveBeenCalledWith('user-1', expect.objectContaining({
      activeThemeId: 'dracula',
    }))
  })

  it('stopThemeSync cancels pending debounced call', () => {
    startThemeSync('user-1')
    triggerThemeStore({ activeThemeId: 'midnight' })
    stopThemeSync()

    vi.advanceTimersByTime(300)
    expect(upsertTheme).not.toHaveBeenCalled()
  })

  it('unsubscribes from store on stopThemeSync', () => {
    startThemeSync('user-1')
    expect(themeListeners.size).toBe(1)
    stopThemeSync()
    expect(themeListeners.size).toBe(0)
  })

  it('re-subscribes on second startThemeSync call (replaces old subscription)', () => {
    startThemeSync('user-1')
    startThemeSync('user-1')
    // stopThemeSync is called internally, so there should be only 1 listener
    expect(themeListeners.size).toBe(1)
  })
})
