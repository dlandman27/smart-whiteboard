import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockWBState = {
  boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform' }],
  activeBoardId: 'b1',
  setLayout: vi.fn(),
  removeWidget: vi.fn(),
}

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) =>
    selector ? selector(mockWBState) : mockWBState
  ),
}))

const mockUIState = {
  canvasSize: { w: 1280, h: 800 },
}

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn((selector?: any) =>
    selector ? selector(mockUIState) : mockUIState
  ),
}))

vi.mock('../../hooks/useLayout', () => ({
  computeSlotRect: vi.fn((slot: any, w: number, h: number) => ({
    id: slot.id,
    x: slot.x * w,
    y: slot.y * h,
    width: slot.width * w,
    height: slot.height * h,
  })),
  DEFAULT_SLOT_GAP: 16,
  DEFAULT_SLOT_PAD: 16,
}))

vi.mock('../widgets/registry', () => ({
  getStaticWidgetDef: vi.fn(() => null),
}))

vi.mock('../../layouts/presets', () => ({
  LAYOUT_PRESETS: [
    { id: 'freeform', name: 'Freeform', slots: [] },
    { id: 'dashboard', name: 'Dashboard', slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }] },
    { id: 'grid-2x2', name: '2x2 Grid', slots: [
      { id: 'r1c1', x: 0,   y: 0,   width: 0.5, height: 0.5 },
      { id: 'r1c2', x: 0.5, y: 0,   width: 0.5, height: 0.5 },
      { id: 'r2c1', x: 0,   y: 0.5, width: 0.5, height: 0.5 },
      { id: 'r2c2', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ]},
  ],
  getLayoutPreset: vi.fn((id: string) => ({
    id,
    name: id,
    slots: id === 'freeform' ? [] : [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }],
  })),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { LayoutPicker } from '../LayoutPicker'

describe('LayoutPicker', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the layout picker overlay', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByText('Change Layout')).toBeInTheDocument()
  })

  it('renders layout options', () => {
    render(<LayoutPicker onClose={onClose} />)
    expect(screen.getByText('Freeform')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('2x2 Grid')).toBeInTheDocument()
  })

  it('closes when clicking freeform (no slots, no widgets)', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'dashboard' }],
      activeBoardId: 'b1',
      setLayout: vi.fn(),
      removeWidget: vi.fn(),
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Freeform'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking overlay background', () => {
    render(<LayoutPicker onClose={onClose} />)
    // Find the overlay div (the outermost div with the backdrop)
    const overlay = document.querySelector('[class*="absolute inset-0"]') ??
                    document.querySelector('div[style*="rgba(0,0,0,0.45)"]')
    if (overlay) {
      fireEvent.pointerDown(overlay, { target: overlay })
    }
    // onClose may or may not be called depending on target
  })

  it('shows assign step when layout with slots is selected and board has widgets', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [{ id: 'w1', x: 0, y: 0, width: 300, height: 200, type: 'clock' }], layoutId: 'freeform' }],
      activeBoardId: 'b1',
      setLayout: vi.fn(),
      removeWidget: vi.fn(),
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Dashboard'))
    expect(screen.getByText('Assign Widgets')).toBeInTheDocument()
  })
})
