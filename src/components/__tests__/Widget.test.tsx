import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock all external stores and libraries before importing the component
vi.mock('../../store/whiteboard', () => {
  const whiteboardState = {
    boards: [
      {
        id: 'b1',
        name: 'Main',
        widgets: [{ id: 'w1', x: 0, y: 0, width: 300, height: 200, settings: {} }],
        widgetStyle: 'solid',
        boardType: undefined,
      },
    ],
    activeBoardId: 'b1',
    updateLayout: vi.fn(),
    removeWidget: vi.fn(),
    splitWidget: vi.fn(),
    updateSettings: vi.fn(),
  }

  const useWhiteboardStore = vi.fn((selector?: any) => {
    if (typeof selector === 'function') return selector(whiteboardState)
    return whiteboardState
  }) as any
  useWhiteboardStore.getState = vi.fn(() => whiteboardState)

  return { useWhiteboardStore }
})

vi.mock('../../store/ui', () => {
  const uiState = {
    focusedWidgetId: null,
    setFocusedWidget: vi.fn(),
    flashingWidgetId: null,
    widgetCommand: null,
    clearWidgetCommand: vi.fn(),
    setFullscreenWidget: vi.fn(),
    canvasSize: { w: 1280, h: 800 },
  }
  return {
    useUIStore: vi.fn((selector?: any) => {
      if (typeof selector === 'function') return selector(uiState)
      return uiState
    }),
  }
})

vi.mock('../../store/undo', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({ push: vi.fn() })),
  },
}))

vi.mock('../../lib/sounds', () => ({
  soundWidgetRemoved: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  IconButton: ({ icon, onClick }: { icon: string; onClick?: () => void }) => (
    <button data-testid={`icon-btn-${icon}`} onClick={onClick}>{icon}</button>
  ),
  Input: ({ label, value, onChange }: { label: string; value: string; onChange: () => void }) => (
    <input aria-label={label} value={value} onChange={onChange} readOnly />
  ),
}))

import { Widget } from '../Widget'

const defaultProps = {
  id: 'w1',
  x: 10,
  y: 20,
  width: 300,
  height: 200,
}

describe('Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children inside the widget frame', () => {
    render(
      <Widget {...defaultProps}>
        <div data-testid="widget-content">Hello Widget</div>
      </Widget>
    )
    expect(screen.getByTestId('widget-content')).toBeInTheDocument()
    expect(screen.getByText('Hello Widget')).toBeInTheDocument()
  })

  it('renders without crashing when no children or settings are provided', () => {
    const { container } = render(
      <Widget {...defaultProps}>
        <span>content</span>
      </Widget>
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('does not show settings panel initially', () => {
    render(
      <Widget {...defaultProps} settingsContent={<div data-testid="my-settings">Settings body</div>}>
        <span>content</span>
      </Widget>
    )
    // Settings panel should not be visible initially
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('applies entrance animation class on mount', () => {
    const { container } = render(
      <Widget {...defaultProps}>
        <span>content</span>
      </Widget>
    )
    // The inner frame div gets the entrance class
    const frame = container.querySelector('.wt-widget-frame')
    expect(frame).toBeTruthy()
    expect(frame?.className).toContain('wt-widget-entrance')
  })

  it('applies position and size as inline styles', () => {
    const { container } = render(
      <Widget {...defaultProps} x={50} y={100} width={400} height={300}>
        <span>positioned</span>
      </Widget>
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.left).toBe('50px')
    expect(outerDiv.style.top).toBe('100px')
    expect(outerDiv.style.width).toBe('400px')
    expect(outerDiv.style.height).toBe('300px')
  })

  it('renders with settingsContent provided but not visible until opened', () => {
    render(
      <Widget {...defaultProps} settingsContent={<div>My Settings</div>}>
        <span>content</span>
      </Widget>
    )
    expect(screen.queryByText('My Settings')).not.toBeInTheDocument()
  })

  it('renders widget with refSize prop without crashing', () => {
    render(
      <Widget {...defaultProps} refSize={{ width: 300, height: 200 }}>
        <span>scaled content</span>
      </Widget>
    )
    expect(screen.getByText('scaled content')).toBeInTheDocument()
  })

  it('renders widget in slot-assigned mode without crashing', () => {
    render(
      <Widget {...defaultProps} slotAssigned>
        <span>slot content</span>
      </Widget>
    )
    expect(screen.getByText('slot content')).toBeInTheDocument()
  })

  it('renders the wt-widget-frame div', () => {
    const { container } = render(
      <Widget {...defaultProps}>
        <span>test</span>
      </Widget>
    )
    expect(container.querySelector('.wt-widget-frame')).toBeTruthy()
  })

  it('sets position to absolute on the outer container', () => {
    const { container } = render(
      <Widget {...defaultProps}>
        <span>test</span>
      </Widget>
    )
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.style.position).toBe('absolute')
  })
})
