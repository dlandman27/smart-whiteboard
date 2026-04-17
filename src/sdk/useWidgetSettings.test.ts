import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { mockUpdateSettings } = vi.hoisted(() => ({
  mockUpdateSettings: vi.fn(),
}))

vi.mock('../store/whiteboard', () => {
  const boards = [
    {
      id: 'board-1',
      name: 'Main',
      widgets: [
        {
          id: 'widget-1',
          type: 'clock',
          settings: { timezone: 'UTC', showSeconds: false },
        },
        {
          id: 'widget-split',
          type: 'split',
          settings: {
            paneA: { settings: { color: 'red' } },
          },
        },
      ],
    },
  ]

  let state: any = {
    boards,
    activeBoardId: 'board-1',
    updateSettings: mockUpdateSettings,
  }

  const mockStore: any = (selector: any) => selector(state)
  mockStore.getState = () => state
  mockStore._setState = (next: any) => { state = { ...state, ...next } }
  return { useWhiteboardStore: mockStore }
})

import { useWhiteboardStore } from '../store/whiteboard'
import { useWidgetSettings } from './useWidgetSettings'

interface ClockSettings {
  timezone: string
  showSeconds: boolean
}

const defaultBoards = [
  {
    id: 'board-1',
    name: 'Main',
    widgets: [
      {
        id: 'widget-1',
        type: 'clock',
        settings: { timezone: 'UTC', showSeconds: false },
      },
      {
        id: 'widget-split',
        type: 'split',
        settings: {
          paneA: { settings: { color: 'red' } },
        },
      },
    ],
  },
]

describe('useWidgetSettings', () => {
  beforeEach(() => {
    mockUpdateSettings.mockClear()
    ;(useWhiteboardStore as any)._setState({
      boards: defaultBoards,
      activeBoardId: 'board-1',
    })
  })

  it('returns stored settings merged with defaults', () => {
    const defaults: ClockSettings = { timezone: 'America/New_York', showSeconds: true }
    const { result } = renderHook(() =>
      useWidgetSettings<ClockSettings>('widget-1', defaults)
    )
    const [settings] = result.current
    // Stored value takes precedence over defaults
    expect(settings.timezone).toBe('UTC')
    expect(settings.showSeconds).toBe(false)
  })

  it('falls back to defaults when widget has no settings', () => {
    ;(useWhiteboardStore as any)._setState({
      boards: [
        {
          id: 'board-1',
          widgets: [{ id: 'widget-2', type: 'text', settings: undefined }],
        },
      ],
      activeBoardId: 'board-1',
    })
    const defaults = { text: 'Hello', fontSize: 16 }
    const { result } = renderHook(() =>
      useWidgetSettings('widget-2', defaults)
    )
    const [settings] = result.current
    expect(settings.text).toBe('Hello')
    expect(settings.fontSize).toBe(16)
  })

  it('returns defaults when widget does not exist on the active board', () => {
    const defaults: ClockSettings = { timezone: 'Europe/London', showSeconds: true }
    const { result } = renderHook(() =>
      useWidgetSettings<ClockSettings>('nonexistent-widget', defaults)
    )
    const [settings] = result.current
    expect(settings.timezone).toBe('Europe/London')
    expect(settings.showSeconds).toBe(true)
  })

  it('calling update invokes updateSettings with the patch', () => {
    const defaults: ClockSettings = { timezone: 'UTC', showSeconds: false }
    const { result } = renderHook(() =>
      useWidgetSettings<ClockSettings>('widget-1', defaults)
    )
    const [, update] = result.current

    act(() => {
      update({ showSeconds: true })
    })

    expect(mockUpdateSettings).toHaveBeenCalledWith('widget-1', { showSeconds: true })
  })

  it('calling update merges only the provided keys', () => {
    const defaults: ClockSettings = { timezone: 'UTC', showSeconds: false }
    const { result } = renderHook(() =>
      useWidgetSettings<ClockSettings>('widget-1', defaults)
    )
    const [, update] = result.current

    act(() => {
      update({ timezone: 'Europe/London' })
    })

    expect(mockUpdateSettings).toHaveBeenCalledWith('widget-1', { timezone: 'Europe/London' })
  })
})

describe('useWidgetSettings — split pane (:: syntax)', () => {
  beforeEach(() => {
    mockUpdateSettings.mockClear()
    ;(useWhiteboardStore as any)._setState({
      boards: defaultBoards,
      activeBoardId: 'board-1',
    })
  })

  it('reads pane-specific settings via :: separator', () => {
    const defaults = { color: 'blue' }
    const { result } = renderHook(() =>
      useWidgetSettings('widget-split::paneA', defaults)
    )
    const [settings] = result.current
    // paneA has { settings: { color: 'red' } }
    expect(settings.color).toBe('red')
  })

  it('falls back to defaults for an unknown pane', () => {
    const defaults = { color: 'blue' }
    const { result } = renderHook(() =>
      useWidgetSettings('widget-split::paneB', defaults)
    )
    const [settings] = result.current
    expect(settings.color).toBe('blue')
  })

  it('calls updateSettings with nested pane settings structure', () => {
    const defaults = { color: 'blue' }
    const { result } = renderHook(() =>
      useWidgetSettings('widget-split::paneA', defaults)
    )
    const [, update] = result.current

    act(() => {
      update({ color: 'green' })
    })

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      'widget-split',
      expect.objectContaining({
        paneA: expect.objectContaining({
          settings: expect.objectContaining({ color: 'green' }),
        }),
      })
    )
  })
})
