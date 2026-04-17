import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn(),
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
import { useWhiteboardStore } from '../../store/whiteboard'
import { useUIStore } from '../../store/ui'

const mockUseWB = vi.mocked(useWhiteboardStore)
const mockUseUI = vi.mocked(useUIStore)

function setWBState(state: any) {
  mockUseWB.mockImplementation((selector?: any) =>
    selector ? selector(state) : state
  )
}

function setUIState(state: any) {
  mockUseUI.mockImplementation((selector?: any) =>
    selector ? selector(state) : state
  )
}

const defaultWBState = {
  boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform' }],
  activeBoardId: 'b1',
  setLayout: vi.fn(),
  removeWidget: vi.fn(),
}

const defaultUIState = { canvasSize: { w: 1280, h: 800 } }

describe('LayoutPicker', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setWBState(defaultWBState)
    setUIState(defaultUIState)
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
    setWBState({
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'dashboard' }],
      activeBoardId: 'b1',
      setLayout: vi.fn(),
      removeWidget: vi.fn(),
    })
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Freeform'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking overlay background', () => {
    render(<LayoutPicker onClose={onClose} />)
    // Freeform has no slots so clicking it should close
    fireEvent.click(screen.getByText('Freeform'))
    // onClose should have been called since freeform has no slots
    expect(onClose).toHaveBeenCalled()
  })

  it('shows assign step when layout with slots is selected and board has widgets', () => {
    setWBState({
      boards: [{ id: 'b1', name: 'Main', widgets: [
        { id: 'w1', x: 0, y: 0, width: 300, height: 200, type: 'clock' },
      ], layoutId: 'freeform' }],
      activeBoardId: 'b1',
      setLayout: vi.fn(),
      removeWidget: vi.fn(),
    })
    render(<LayoutPicker onClose={onClose} />)
    fireEvent.click(screen.getByText('Dashboard'))
    expect(screen.getByText('Assign Widgets')).toBeInTheDocument()
  })
})
