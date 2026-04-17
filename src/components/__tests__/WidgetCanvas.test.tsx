import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform' }],
      activeBoardId: 'b1',
      addWidget: vi.fn(),
      updateLayout: vi.fn(),
      assignSlot: vi.fn(),
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../hooks/useLayout', () => ({
  useLayout: vi.fn(() => ({
    layout: { id: 'freeform', name: 'Freeform', slots: [] },
    slotRects: [],
    slotMap: {},
    slotGap: 12,
    slotPad: 16,
  })),
}))

vi.mock('../Widget', () => ({
  Widget: ({ id, children }: any) => (
    <div data-testid={`widget-${id}`}>{children}</div>
  ),
}))

vi.mock('./layout/LayoutSlots', () => ({
  LayoutSlots: () => <div data-testid="layout-slots" />,
}))

vi.mock('../layout/LayoutSlots', () => ({
  LayoutSlots: () => <div data-testid="layout-slots" />,
}))

vi.mock('../widgets/DatabaseWidget', () => ({
  DatabaseWidget: ({ widgetId }: any) => <div data-testid={`db-widget-${widgetId}`} />,
}))

vi.mock('../widgets/CalendarWidget', () => ({
  CalendarWidget: ({ widgetId }: any) => <div data-testid={`cal-widget-${widgetId}`} />,
}))

vi.mock('../widgets/registry', () => ({
  getWidgetType: vi.fn(() => null),
  getWidgetVariant: vi.fn(() => null),
}))

vi.mock('../../lib/sounds', () => ({
  soundWidgetDrop: vi.fn(),
  soundWidgetPickup: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}))

import { WidgetCanvas } from '../WidgetCanvas'
import { useWhiteboardStore } from '../../store/whiteboard'

const defaultProps = {
  activeTool: 'pointer',
  pendingWidget: null,
  onClearPending: vi.fn(),
  onDoubleTap: vi.fn(),
  onWidgetDoubleTap: vi.fn(),
}

describe('WidgetCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<WidgetCanvas {...defaultProps} />)
    expect(screen.getByTestId('layout-slots')).toBeInTheDocument()
  })

  it('renders no widgets when board has no widgets', () => {
    render(<WidgetCanvas {...defaultProps} />)
    // No widget-* testids should appear
    const widgets = screen.queryAllByTestId(/^widget-/)
    expect(widgets).toHaveLength(0)
  })

  it('renders widgets from the active board', () => {
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{
          id: 'b1',
          name: 'Main',
          layoutId: 'freeform',
          widgets: [
            { id: 'w1', x: 0, y: 0, width: 300, height: 200, type: 'clock' },
            { id: 'w2', x: 320, y: 0, width: 300, height: 200, type: 'clock' },
          ],
        }],
        activeBoardId: 'b1',
        addWidget: vi.fn(),
        updateLayout: vi.fn(),
        assignSlot: vi.fn(),
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<WidgetCanvas {...defaultProps} />)
    expect(screen.getByTestId('widget-w1')).toBeInTheDocument()
    expect(screen.getByTestId('widget-w2')).toBeInTheDocument()
  })

  it('renders pending placement hint when pendingWidget is set', () => {
    const pending = { type: 'clock', width: 200, height: 150, variantId: 'default' }
    render(<WidgetCanvas {...defaultProps} pendingWidget={pending as any} />)
    expect(screen.getByText(/Click anywhere to place|Click a slot to place/)).toBeInTheDocument()
  })

  it('shows cancel button when pendingWidget is set', () => {
    const pending = { type: 'clock', width: 200, height: 150, variantId: 'default' }
    render(<WidgetCanvas {...defaultProps} pendingWidget={pending as any} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('deduplicates widgets with the same id', () => {
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{
          id: 'b1',
          name: 'Main',
          layoutId: 'freeform',
          widgets: [
            { id: 'w1', x: 0, y: 0, width: 300, height: 200, type: 'clock' },
            { id: 'w1', x: 10, y: 10, width: 300, height: 200, type: 'clock' }, // duplicate
          ],
        }],
        activeBoardId: 'b1',
        addWidget: vi.fn(),
        updateLayout: vi.fn(),
        assignSlot: vi.fn(),
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<WidgetCanvas {...defaultProps} />)
    // Only one widget rendered despite two entries
    expect(screen.getAllByTestId(/^widget-w1/).length).toBe(1)
  })
})
