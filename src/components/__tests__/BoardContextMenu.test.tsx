import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { BoardContextMenu } from '../BoardContextMenu'
import { useWhiteboardStore } from '../../store/whiteboard'
import { useUIStore } from '../../store/ui'

const mockUseWB = vi.mocked(useWhiteboardStore)
const mockUseUI = vi.mocked(useUIStore)

const defaultWBState = {
  boards: [{ id: 'b1', name: 'Test Board', widgets: [] }],
  activeBoardId: 'b1',
  renameBoard: vi.fn(),
}

const defaultUIState = {
  sendWidgetCommand: vi.fn(),
  fullscreenWidgetId: null,
}

const defaultProps = {
  x: 100,
  y: 100,
  canvasW: 1280,
  canvasH: 800,
  onClose: vi.fn(),
  onAddWidget: vi.fn(),
  onChangeLayout: vi.fn(),
  onBoardSettings: vi.fn(),
  widgetCtx: null,
}

describe('BoardContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUseWB.mockImplementation((selector?: any) =>
      selector ? selector(defaultWBState) : defaultWBState
    )
    mockUseUI.mockImplementation((selector?: any) =>
      selector ? selector(defaultUIState) : defaultUIState
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders without crashing', () => {
    render(<BoardContextMenu {...defaultProps} />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders board action items', () => {
    render(<BoardContextMenu {...defaultProps} />)
    expect(screen.getByText('Add widget')).toBeInTheDocument()
    expect(screen.getByText('Change layout')).toBeInTheDocument()
    expect(screen.getByText('Board settings')).toBeInTheDocument()
  })

  it('calls onAddWidget when "Add widget" is clicked', () => {
    const onAddWidget = vi.fn()
    const onClose = vi.fn()
    render(<BoardContextMenu {...defaultProps} onAddWidget={onAddWidget} onClose={onClose} />)
    fireEvent.click(screen.getByText('Add widget'))
    act(() => { vi.advanceTimersByTime(200) })
    expect(onAddWidget).toHaveBeenCalled()
  })

  it('calls onChangeLayout when "Change layout" is clicked', () => {
    const onChangeLayout = vi.fn()
    const onClose = vi.fn()
    render(<BoardContextMenu {...defaultProps} onChangeLayout={onChangeLayout} onClose={onClose} />)
    fireEvent.click(screen.getByText('Change layout'))
    act(() => { vi.advanceTimersByTime(200) })
    expect(onChangeLayout).toHaveBeenCalled()
  })

  it('renders widget context items when widgetCtx is provided', () => {
    render(<BoardContextMenu
      {...defaultProps}
      widgetCtx={{ id: 'w1', hasSettings: true }}
    />)
    expect(screen.getByText('Widget settings')).toBeInTheDocument()
    expect(screen.getByText('Delete widget')).toBeInTheDocument()
  })

  it('does not show widget settings item if hasSettings is false', () => {
    render(<BoardContextMenu
      {...defaultProps}
      widgetCtx={{ id: 'w1', hasSettings: false }}
    />)
    expect(screen.queryByText('Widget settings')).not.toBeInTheDocument()
    expect(screen.getByText('Delete widget')).toBeInTheDocument()
  })

  it('shows Fullscreen option when widgetCtx is provided', () => {
    render(<BoardContextMenu
      {...defaultProps}
      widgetCtx={{ id: 'w1', hasSettings: false }}
    />)
    expect(screen.getByText('Fullscreen')).toBeInTheDocument()
  })

  it('auto-dismisses after 5 seconds', () => {
    const onClose = vi.fn()
    render(<BoardContextMenu {...defaultProps} onClose={onClose} />)
    act(() => { vi.advanceTimersByTime(5200) })
    expect(onClose).toHaveBeenCalled()
  })

  it('dismisses on Escape key', () => {
    const onClose = vi.fn()
    render(<BoardContextMenu {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    act(() => { vi.advanceTimersByTime(200) })
    expect(onClose).toHaveBeenCalled()
  })
})
