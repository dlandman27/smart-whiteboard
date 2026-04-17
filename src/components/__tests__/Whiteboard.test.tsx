import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// All vi.mock calls must be at the top

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform' }],
      activeBoardId: 'b1',
      setActiveBoardManual: vi.fn(),
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn((selector?: any) => {
    const state = {
      focusedWidgetId: null,
      setFocusedWidget: vi.fn(),
      setCanvasSize: vi.fn(),
      canvasSize: { w: 1280, h: 800 },
      displayMode: false,
      setDisplayMode: vi.fn(),
      toggleDisplayMode: vi.fn(),
      screensaverMode: false,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn((selector?: any) => {
    const state = { background: 'default', petsEnabled: false }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../hooks/useCanvasSocket', () => ({ useCanvasSocket: vi.fn() }))
vi.mock('../../hooks/useScheduleEngine', () => ({ useScheduleEngine: vi.fn() }))
vi.mock('../../hooks/useHashRouter', () => ({ useHashRouter: vi.fn() }))

vi.mock('../WhiteboardBackground', () => ({
  WhiteboardBackground: ({ children }: any) => <div data-testid="wb-background">{children}</div>,
}))
vi.mock('../WalliChat', () => ({
  WalliChatButton: () => <div data-testid="walli-chat-button" />,
}))
vi.mock('../BottomToolbar', () => ({
  BottomToolbar: () => <div data-testid="bottom-toolbar" />,
}))
vi.mock('../WidgetCanvas', () => ({
  WidgetCanvas: () => <div data-testid="widget-canvas" />,
}))
vi.mock('../CalendarBoardView', () => ({
  CalendarBoardView: () => <div data-testid="calendar-board-view" />,
}))
vi.mock('../SettingsBoardView', () => ({
  SettingsBoardView: () => <div data-testid="settings-board-view" />,
}))
vi.mock('../ConnectorsBoardView', () => ({
  ConnectorsBoardView: () => <div data-testid="connectors-board-view" />,
}))
vi.mock('../TodayBoardView', () => ({
  TodayBoardView: () => <div data-testid="today-board-view" />,
}))
vi.mock('../TodoBoardView', () => ({
  TodoBoardView: () => <div data-testid="todo-board-view" />,
}))
vi.mock('../FeedbackBoardView', () => ({
  FeedbackBoardView: () => <div data-testid="feedback-board-view" />,
}))
vi.mock('../NotificationToast', () => ({
  NotificationToast: () => <div data-testid="notification-toast" />,
}))
vi.mock('../UndoToast', () => ({
  UndoToast: () => <div data-testid="undo-toast" />,
}))
vi.mock('../VoiceListener', () => ({
  VoiceListener: () => <div data-testid="voice-listener" />,
}))
vi.mock('../PetBar', () => ({
  PetBar: () => <div data-testid="pet-bar" />,
}))
vi.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}))
vi.mock('../BoardContextMenu', () => ({
  BoardContextMenu: () => <div data-testid="board-context-menu" />,
}))
vi.mock('../LayoutPicker', () => ({
  LayoutPicker: () => <div data-testid="layout-picker" />,
}))
vi.mock('../BoardSettingsPanel', () => ({
  BoardSettingsPanel: () => <div data-testid="board-settings-panel" />,
}))
vi.mock('../Screensaver', () => ({
  Screensaver: () => <div data-testid="screensaver" />,
}))

import { Whiteboard } from '../Whiteboard'
import { useWhiteboardStore } from '../../store/whiteboard'
import { useUIStore } from '../../store/ui'

describe('Whiteboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('wb-background')).toBeInTheDocument()
  })

  it('renders the sidebar when not in display mode', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders the widget canvas for a normal board', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('widget-canvas')).toBeInTheDocument()
  })

  it('renders the bottom toolbar when not in display mode', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('bottom-toolbar')).toBeInTheDocument()
  })

  it('renders the WalliChatButton for non-system boards', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('walli-chat-button')).toBeInTheDocument()
  })

  it('renders CalendarBoardView for calendar boardType', () => {
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{ id: 'b1', name: 'Calendar', widgets: [], layoutId: 'freeform', boardType: 'calendar' }],
        activeBoardId: 'b1',
        setActiveBoardManual: vi.fn(),
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<Whiteboard />)
    expect(screen.getByTestId('calendar-board-view')).toBeInTheDocument()
  })

  it('renders TodoBoardView for todo boardType', () => {
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{ id: 'b1', name: 'Todo', widgets: [], layoutId: 'freeform', boardType: 'todo' }],
        activeBoardId: 'b1',
        setActiveBoardManual: vi.fn(),
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<Whiteboard />)
    expect(screen.getByTestId('todo-board-view')).toBeInTheDocument()
  })

  it('does not render sidebar in display mode', () => {
    vi.mocked(useUIStore).mockImplementation((selector?: any) => {
      const state = {
        focusedWidgetId: null,
        setFocusedWidget: vi.fn(),
        setCanvasSize: vi.fn(),
        canvasSize: { w: 1280, h: 800 },
        displayMode: true,
        setDisplayMode: vi.fn(),
        toggleDisplayMode: vi.fn(),
        screensaverMode: false,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<Whiteboard />)
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
  })

  it('renders notification and undo toasts', () => {
    render(<Whiteboard />)
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument()
    expect(screen.getByTestId('undo-toast')).toBeInTheDocument()
  })
})
