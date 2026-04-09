import { useMemo } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { getLayoutPreset } from '../layouts/presets'
import type { LayoutSlot } from '../types'

export const DEFAULT_SLOT_GAP = 12  // px gap between adjacent slots
export const DEFAULT_SLOT_PAD = 16  // px padding from canvas edges
export const TOOLBAR_RESERVED = 0

export interface SlotRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function computeSlotRect(slot: LayoutSlot, canvasW: number, canvasH: number, slotGap = DEFAULT_SLOT_GAP, slotPad = DEFAULT_SLOT_PAD): SlotRect {
  const usableW = canvasW - slotPad * 2
  const usableH = canvasH - slotPad * 2

  const leftGap  = slot.x > 0.001                    ? slotGap / 2 : 0
  const rightGap = slot.x + slot.width  < 0.999       ? slotGap / 2 : 0
  const topGap   = slot.y > 0.001                    ? slotGap / 2 : 0
  const botGap   = slot.y + slot.height < 0.999       ? slotGap / 2 : 0

  return {
    id:     slot.id,
    x:      slotPad + slot.x      * usableW + leftGap,
    y:      slotPad + slot.y      * usableH + topGap,
    width:  slot.width  * usableW - leftGap - rightGap,
    height: slot.height * usableH - topGap  - botGap,
  }
}

export function useLayout() {
  const boards        = useWhiteboardStore((s) => s.boards)
  const activeBoardId = useWhiteboardStore((s) => s.activeBoardId)
  const activeBoard   = boards.find((b) => b.id === activeBoardId)
  const slotGap       = activeBoard?.slotGap ?? DEFAULT_SLOT_GAP
  const slotPad       = activeBoard?.slotPad ?? DEFAULT_SLOT_PAD

  const layoutId = activeBoard?.layoutId ?? 'dashboard'
  const preset   = getLayoutPreset(layoutId)
  const layout   = layoutId === 'custom' && activeBoard?.customSlots
    ? { ...preset, slots: activeBoard.customSlots }
    : preset

  const canvasSize = useUIStore((s) => s.canvasSize)
  const canvas = { w: canvasSize.w, h: canvasSize.h }

  const slotRects = useMemo(
    () => layout.slots.map((s) => computeSlotRect(s, canvas.w, canvas.h, slotGap, slotPad)),
    [layout, canvas, slotGap, slotPad],
  )

  const slotMap = useMemo(
    () => Object.fromEntries(slotRects.map((r) => [r.id, r])),
    [slotRects],
  )

  return { layout, slotRects, slotMap, slotGap, slotPad }
}
