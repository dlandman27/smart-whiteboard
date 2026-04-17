import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [{ id: 'b1', name: 'Main', widgets: [], layoutId: 'freeform' }],
      activeBoardId: 'b1',
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

vi.mock('../layout/LayoutSlot', () => ({
  LayoutSlot: ({ id, mode, isHovered, onClick }: any) => (
    <div
      data-testid={`layout-slot-${id}`}
      data-mode={mode}
      data-hovered={String(isHovered)}
      onClick={onClick}
    />
  ),
}))

import { LayoutSlots } from '../layout/LayoutSlots'
import { useLayout } from '../../hooks/useLayout'
import { useWhiteboardStore } from '../../store/whiteboard'

const defaultProps = {
  pendingWidget: null,
  draggingWidgetId: null,
  hoveredSlotId: null,
  onSlotClick: vi.fn(),
}

describe('LayoutSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when there are no slot rects', () => {
    const { container } = render(<LayoutSlots {...defaultProps} />)
    expect(container.querySelectorAll('[data-testid^="layout-slot-"]')).toHaveLength(0)
  })

  it('renders a slot for each slotRect', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
        { id: 'right', x: 640, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    render(<LayoutSlots {...defaultProps} />)
    expect(screen.getByTestId('layout-slot-left')).toBeInTheDocument()
    expect(screen.getByTestId('layout-slot-right')).toBeInTheDocument()
  })

  it('all slots are hidden when no pending widget and no dragging', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    render(<LayoutSlots {...defaultProps} pendingWidget={null} draggingWidgetId={null} />)
    const slot = screen.getByTestId('layout-slot-left')
    expect(slot.dataset.mode).toBe('hidden')
  })

  it('slots show place mode when pendingWidget is set', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    const pending = { type: 'clock', width: 200, height: 150, variantId: 'default' }
    render(<LayoutSlots {...defaultProps} pendingWidget={pending as any} />)
    const slot = screen.getByTestId('layout-slot-left')
    expect(slot.dataset.mode).toBe('place')
  })

  it('slot shows swap mode when occupied by a different widget and dragging', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{
          id: 'b1',
          name: 'Main',
          layoutId: 'split-h',
          widgets: [
            { id: 'w-occupant', x: 0, y: 0, width: 640, height: 800, slotId: 'left' },
          ],
        }],
        activeBoardId: 'b1',
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<LayoutSlots {...defaultProps} draggingWidgetId="w-dragging" />)
    const slot = screen.getByTestId('layout-slot-left')
    expect(slot.dataset.mode).toBe('swap')
  })

  it('slot shows place mode when occupied only by the dragging widget itself', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{
          id: 'b1',
          name: 'Main',
          layoutId: 'split-h',
          widgets: [
            { id: 'w-dragging', x: 0, y: 0, width: 640, height: 800, slotId: 'left' },
          ],
        }],
        activeBoardId: 'b1',
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    render(<LayoutSlots {...defaultProps} draggingWidgetId="w-dragging" />)
    const slot = screen.getByTestId('layout-slot-left')
    expect(slot.dataset.mode).toBe('place')
  })

  it('hoveredSlotId sets isHovered correctly', () => {
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'split-h', name: 'Split', slots: [] },
      slotRects: [
        { id: 'left', x: 0, y: 0, width: 640, height: 800 },
        { id: 'right', x: 640, y: 0, width: 640, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    const pending = { type: 'clock', width: 200, height: 150, variantId: 'default' }
    render(<LayoutSlots {...defaultProps} pendingWidget={pending as any} hoveredSlotId="left" />)
    expect(screen.getByTestId('layout-slot-left').dataset.hovered).toBe('true')
    expect(screen.getByTestId('layout-slot-right').dataset.hovered).toBe('false')
  })

  it('calls onSlotClick when a visible slot is clicked', () => {
    const onSlotClick = vi.fn()
    vi.mocked(useLayout).mockReturnValue({
      layout: { id: 'focus', name: 'Focus', slots: [] },
      slotRects: [
        { id: 'main', x: 0, y: 0, width: 1280, height: 800 },
      ],
      slotMap: {},
      slotGap: 12,
      slotPad: 16,
    } as any)
    const pending = { type: 'clock', width: 200, height: 150, variantId: 'default' }
    render(<LayoutSlots {...defaultProps} pendingWidget={pending as any} onSlotClick={onSlotClick} />)
    fireEvent.click(screen.getByTestId('layout-slot-main'))
    expect(onSlotClick).toHaveBeenCalledWith('main')
  })
})
