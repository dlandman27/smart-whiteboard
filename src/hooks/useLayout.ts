import { useEffect, useMemo, useState } from 'react'
import { useWhiteboardStore } from '../store/whiteboard'
import { getLayoutPreset } from '../layouts/presets'
import type { LayoutSlot } from '../types'

export const DEFAULT_SLOT_GAP = 12  // px gap between adjacent slots
export const DEFAULT_SLOT_PAD = 16  // px padding from canvas edges
export const TOOLBAR_RESERVED = 68  // px reserved at bottom for toolbar

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

function getWindowCanvas() {
  return {
    w: window.innerWidth,
    h: window.innerHeight - TOOLBAR_RESERVED,
  }
}

export function useLayout() {
  const boards        = useWhiteboardStore((s) => s.boards)
  const activeBoardId = useWhiteboardStore((s) => s.activeBoardId)
  const activeBoard   = boards.find((b) => b.id === activeBoardId)
  const layout        = getLayoutPreset(activeBoard?.layoutId ?? 'dashboard')
  const slotGap       = activeBoard?.slotGap ?? DEFAULT_SLOT_GAP
  const slotPad       = activeBoard?.slotPad ?? DEFAULT_SLOT_PAD

  const [canvas, setCanvas] = useState(getWindowCanvas)

  useEffect(() => {
    function onResize() { setCanvas(getWindowCanvas()) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
