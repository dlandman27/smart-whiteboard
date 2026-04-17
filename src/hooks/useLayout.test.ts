import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock stores
vi.mock('../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('../store/ui', () => ({
  useUIStore: vi.fn(),
}))

import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { useLayout, computeSlotRect, DEFAULT_SLOT_GAP, DEFAULT_SLOT_PAD } from './useLayout'

const mockBoards = [
  {
    id: 'board-1',
    name: 'Main',
    layoutId: 'dashboard',
    widgets: [],
  },
]

function setupMocks(overrides: Partial<typeof mockBoards[0]> = {}) {
  const board = { ...mockBoards[0], ...overrides }
  ;(useWhiteboardStore as any).mockImplementation((selector: any) =>
    selector({
      boards: [board],
      activeBoardId: 'board-1',
    })
  )
  ;(useUIStore as any).mockImplementation((selector: any) =>
    selector({ canvasSize: { w: 1280, h: 720 } })
  )
}

describe('computeSlotRect', () => {
  const canvasW = 1000
  const canvasH = 800
  const pad = DEFAULT_SLOT_PAD
  const gap = DEFAULT_SLOT_GAP

  it('computes full-canvas slot (x=0, y=0, w=1, h=1) correctly', () => {
    const slot = { id: 'main', x: 0, y: 0, width: 1, height: 1 }
    const rect = computeSlotRect(slot, canvasW, canvasH)
    expect(rect.id).toBe('main')
    expect(rect.x).toBe(pad)
    expect(rect.y).toBe(pad)
    expect(rect.width).toBe(canvasW - pad * 2)
    expect(rect.height).toBe(canvasH - pad * 2)
  })

  it('applies gap on interior edges', () => {
    // Left cell of a 50/50 split — right edge is interior
    const left = { id: 'left', x: 0, y: 0, width: 0.5, height: 1 }
    const rect = computeSlotRect(left, canvasW, canvasH, gap, pad)
    // Right gap should be applied (slot.x + slot.width < 0.999)
    expect(rect.width).toBeLessThan((canvasW - pad * 2) * 0.5)
  })

  it('applies gap on the right edge for the right cell of a split', () => {
    const right = { id: 'right', x: 0.5, y: 0, width: 0.5, height: 1 }
    const rect = computeSlotRect(right, canvasW, canvasH, gap, pad)
    // Left gap should be applied (slot.x > 0.001)
    expect(rect.x).toBeGreaterThan(pad + 0.5 * (canvasW - pad * 2))
  })

  it('accepts custom gap and pad values', () => {
    const slot = { id: 's', x: 0, y: 0, width: 1, height: 1 }
    const r1 = computeSlotRect(slot, canvasW, canvasH, 0, 0)
    expect(r1.x).toBe(0)
    expect(r1.y).toBe(0)
    expect(r1.width).toBe(canvasW)
    expect(r1.height).toBe(canvasH)
  })
})

describe('useLayout', () => {
  beforeEach(() => setupMocks())
  afterEach(() => vi.clearAllMocks())

  it('returns slotRects array with correct length for dashboard layout', () => {
    const { result } = renderHook(() => useLayout())
    // dashboard has 4 slots
    expect(result.current.slotRects).toHaveLength(4)
  })

  it('returns a slotMap keyed by slot id', () => {
    const { result } = renderHook(() => useLayout())
    const { slotRects, slotMap } = result.current
    for (const rect of slotRects) {
      expect(slotMap[rect.id]).toEqual(rect)
    }
  })

  it('uses custom slots when layoutId is "custom"', () => {
    const customSlots = [
      { id: 'c1', x: 0, y: 0, width: 0.5, height: 1 },
      { id: 'c2', x: 0.5, y: 0, width: 0.5, height: 1 },
    ]
    ;(useWhiteboardStore as any).mockImplementation((selector: any) =>
      selector({
        boards: [{ id: 'board-1', name: 'Main', layoutId: 'custom', widgets: [], customSlots }],
        activeBoardId: 'board-1',
      })
    )
    const { result } = renderHook(() => useLayout())
    expect(result.current.slotRects).toHaveLength(2)
    expect(result.current.slotRects[0].id).toBe('c1')
  })

  it('falls back to default slotGap and slotPad when board does not specify them', () => {
    const { result } = renderHook(() => useLayout())
    expect(result.current.slotGap).toBe(DEFAULT_SLOT_GAP)
    expect(result.current.slotPad).toBe(DEFAULT_SLOT_PAD)
  })

  it('uses board-specified slotGap and slotPad', () => {
    ;(useWhiteboardStore as any).mockImplementation((selector: any) =>
      selector({
        boards: [{ id: 'board-1', name: 'Main', layoutId: 'dashboard', widgets: [], slotGap: 20, slotPad: 30 }],
        activeBoardId: 'board-1',
      })
    )
    const { result } = renderHook(() => useLayout())
    expect(result.current.slotGap).toBe(20)
    expect(result.current.slotPad).toBe(30)
  })

  it('returns layout object from preset', () => {
    const { result } = renderHook(() => useLayout())
    expect(result.current.layout.id).toBe('dashboard')
    expect(result.current.layout.slots.length).toBeGreaterThan(0)
  })
})
