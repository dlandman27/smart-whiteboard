import { useEffect, useRef, useState } from 'react'
import { Text, Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUndoStore } from '../store/undo'
import { useLayout } from '../hooks/useLayout'
import { Widget } from './Widget'
import { LayoutSlots } from './layout/LayoutSlots'
import { DatabaseWidget } from './widgets/DatabaseWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { getWidgetType, getWidgetVariant } from './widgets/registry'
import { soundWidgetRemoved } from '../lib/sounds'
import type { PendingWidget } from '../types'

interface Props {
  activeTool:          string
  pendingWidget:       PendingWidget | null
  onClearPending:      () => void
  onDoubleTap:         (x: number, y: number) => void
  onWidgetDoubleTap?:  (widgetId: string, x: number, y: number, hasSettings: boolean) => void
}

export function WidgetCanvas({ activeTool, pendingWidget, onClearPending, onDoubleTap, onWidgetDoubleTap }: Props) {
  const { boards, activeBoardId, addWidget, updateLayout, assignSlot, removeWidget } = useWhiteboardStore()
  const { slotMap } = useLayout()

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const rawWidgets  = boards[activeIndex]?.widgets ?? []
  // Deduplicate and filter out hidden widgets — hidden widgets are retained in the
  // store for non-destructive layout switching but must not render on the canvas.
  const widgets     = [...new Map(rawWidgets.map((w) => [w.id, w])).values()].filter((w) => !w.hidden)

  // Layout transition animation: detect layoutId changes and briefly enable CSS
  // transitions on widget position/size. This must NOT fire during drag/resize.
  const currentLayoutId = boards[activeIndex]?.layoutId
  const prevLayoutIdRef = useRef<string | undefined>(undefined)
  const [layoutTransitioning, setLayoutTransitioning] = useState(false)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevLayoutIdRef.current !== undefined && prevLayoutIdRef.current !== currentLayoutId) {
      setLayoutTransitioning(true)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = setTimeout(() => setLayoutTransitioning(false), 350)
    }
    prevLayoutIdRef.current = currentLayoutId
  }, [currentLayoutId])

  // Cleanup transition timer on unmount
  useEffect(() => () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
  }, [])

  // Track which widget is being dragged and which slot is hovered
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null)
  const [hoveredSlotId,    setHoveredSlotId]    = useState<string | null>(null)
  const hoveredSlotRef   = useRef<string | null>(null)
  // Capture widget's original rect+slot before drag so we can snap back on miss
  const dragStartRef = useRef<{ x: number; y: number; width: number; height: number; slotId?: string } | null>(null)
  // Double-tap detection
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null)

  // Trash zone
  const [overTrash,   setOverTrash]   = useState(false)
  const overTrashRef  = useRef(false)
  const trashZoneRef  = useRef<HTMLDivElement>(null)

  // Auto-assign any slotless widgets (legacy freeform leftovers, or new widgets added without a slot)
  // to the next empty slot in the active layout.
  // Hidden widgets are excluded — they must not be auto-restored here; restoration
  // happens deliberately via the layout picker's aspect-ratio matcher.
  useEffect(() => {
    const allNonHidden = (boards[activeIndex]?.widgets ?? []).filter((w) => !w.hidden)
    const slotless = allNonHidden.filter((w) => !w.slotId || !slotMap[w.slotId])
    if (slotless.length === 0) return
    const occupied      = new Set(allNonHidden.filter((w) => w.slotId && slotMap[w.slotId]).map((w) => w.slotId!))
    const emptySlotIds  = Object.keys(slotMap).filter((id) => !occupied.has(id))
    for (let i = 0; i < slotless.length && i < emptySlotIds.length; i++) {
      assignSlot(slotless[i].id, emptySlotIds[i])
    }
  }, [activeBoardId, boards, slotMap, assignSlot, activeIndex])

  // Cancel pending placement on Escape
  useEffect(() => {
    if (!pendingWidget) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClearPending()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingWidget, onClearPending])

  function findSlotAtCenter(cx: number, cy: number): string | null {
    for (const slot of Object.values(slotMap)) {
      if (cx >= slot.x && cx <= slot.x + slot.width && cy >= slot.y && cy <= slot.y + slot.height) {
        return slot.id
      }
    }
    return null
  }

  function findNearestSlot(cx: number, cy: number, opts?: { emptyOnly?: boolean; excludeWidgetId?: string }): string | null {
    let bestId: string | null = null
    let bestDist = Infinity
    for (const slot of Object.values(slotMap)) {
      if (opts?.emptyOnly && widgets.some((w) => w.id !== opts.excludeWidgetId && w.slotId === slot.id)) continue
      const sx = slot.x + slot.width  / 2
      const sy = slot.y + slot.height / 2
      const d  = (cx - sx) ** 2 + (cy - sy) ** 2
      if (d < bestDist) { bestDist = d; bestId = slot.id }
    }
    return bestId
  }

  function handleDragMove(cx: number, cy: number) {
    const slotId = findSlotAtCenter(cx, cy)
    if (slotId !== hoveredSlotRef.current) {
      hoveredSlotRef.current = slotId
      setHoveredSlotId(slotId)
    }

    // Check trash zone — use canvas-relative coords vs the trash zone element's position
    const trashEl    = trashZoneRef.current
    const canvasEl   = trashEl?.closest('.widget-canvas-root') as HTMLElement | null
    const trashRect  = trashEl?.getBoundingClientRect()
    const canvasRect = canvasEl?.getBoundingClientRect()
    const isOver = !!(trashRect && canvasRect &&
      cx >= trashRect.left - canvasRect.left &&
      cx <= trashRect.right - canvasRect.left &&
      cy >= trashRect.top  - canvasRect.top  &&
      cy <= trashRect.bottom - canvasRect.top)
    if (isOver !== overTrashRef.current) {
      overTrashRef.current = isOver
      setOverTrash(isOver)
    }
  }

  function handleDragEnd() {
    setDraggingWidgetId(null)
    setHoveredSlotId(null)
    hoveredSlotRef.current = null
    dragStartRef.current   = null
    overTrashRef.current   = false
    setOverTrash(false)
  }

  // When a widget is dropped, snap to slot under cursor — or to the nearest slot if cursor missed.
  // Bento-only: every widget always lands in a slot.
  function handleDropped(widgetId: string, _rect: { x: number; y: number; width: number; height: number }, cursorPt: { x: number; y: number }) {
    if (overTrashRef.current) {
      const state    = useWhiteboardStore.getState()
      const snapshot = state.boards.find((b) => b.id === state.activeBoardId)?.widgets.find((w) => w.id === widgetId)
      soundWidgetRemoved()
      removeWidget(widgetId)
      if (snapshot) useUndoStore.getState().push('Widget removed', snapshot)
      overTrashRef.current = false
      setOverTrash(false)
      return
    }

    const targetSlotId = findSlotAtCenter(cursorPt.x, cursorPt.y) ?? findNearestSlot(cursorPt.x, cursorPt.y)
    if (!targetSlotId) return  // No slots in layout (shouldn't happen post-bento-migration)

    const targetSlotRect = slotMap[targetSlotId]
    if (!targetSlotRect) return

    const draggedWidget = widgets.find((w) => w.id === widgetId)
    const draggedSlotId = draggedWidget?.slotId

    // No-op if dropped on its own slot
    if (draggedSlotId === targetSlotId) {
      updateLayout(widgetId, { x: targetSlotRect.x, y: targetSlotRect.y, width: targetSlotRect.width, height: targetSlotRect.height })
      return
    }

    // Swap with occupant if any
    const occupant = widgets.find((w) => w.id !== widgetId && w.slotId === targetSlotId)
    if (occupant && draggedSlotId && slotMap[draggedSlotId]) {
      const draggedSlotRect = slotMap[draggedSlotId]
      updateLayout(occupant.id, { x: draggedSlotRect.x, y: draggedSlotRect.y, width: draggedSlotRect.width, height: draggedSlotRect.height })
      assignSlot(occupant.id, draggedSlotId)
    }

    updateLayout(widgetId, { x: targetSlotRect.x, y: targetSlotRect.y, width: targetSlotRect.width, height: targetSlotRect.height })
    assignSlot(widgetId, targetSlotId)
  }

  function handleSlotClick(slotId: string) {
    if (!pendingWidget) return
    const rect = slotMap[slotId]
    if (!rect) return

    // Bento-only: only empty slots are clickable when adding (LayoutSlots gates this).
    addWidget({ ...pendingWidget, slotId, x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    onClearPending()
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect  = e.currentTarget.getBoundingClientRect()
    const cx    = e.clientX - rect.left
    const cy    = e.clientY - rect.top
    const now   = Date.now()
    const last  = lastTapRef.current

    // Double-tap: two clicks within 300ms within 20px of each other on empty canvas
    if (!pendingWidget && last && (now - last.time) < 300 && Math.abs(cx - last.x) < 20 && Math.abs(cy - last.y) < 20) {
      lastTapRef.current = null
      onDoubleTap(cx, cy)
      return
    }

    lastTapRef.current = { x: cx, y: cy, time: now }

    // Bento-only: clicking the canvas (outside any slot) while placing a widget routes it to the nearest empty slot.
    if (!pendingWidget) return
    const targetSlotId = findNearestSlot(cx, cy, { emptyOnly: true })
    if (!targetSlotId) return  // No empty slot — keep pending so user can switch layouts or cancel
    const targetRect = slotMap[targetSlotId]
    addWidget({ ...pendingWidget, slotId: targetSlotId, x: targetRect.x, y: targetRect.y, width: targetRect.width, height: targetRect.height })
    onClearPending()
  }

  return (
    <div
      key={activeBoardId}
      className="widget-canvas-root absolute inset-0 board-slide-right select-none"
      onClick={handleCanvasClick}
      onMouseDown={(e) => { if (e.detail >= 2) e.preventDefault() }}
    >

      {/* Slot zones — visible when adding a widget or dragging */}
      <LayoutSlots
        pendingWidget={pendingWidget}
        draggingWidgetId={draggingWidgetId}
        hoveredSlotId={hoveredSlotId}
        onSlotClick={handleSlotClick}
      />

      {/* Pending placement hint */}
      {pendingWidget && (
        <div className="absolute inset-0 flex items-end justify-center pb-24 z-10" style={{ pointerEvents: 'none' }}>
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: 'var(--wt-settings-bg)',
              border:          '1px solid var(--wt-settings-border)',
              boxShadow:       'var(--wt-shadow-md)',
              color:           'var(--wt-text)',
              pointerEvents:   'auto',
            }}
          >
            <span>Click a slot to place</span>
            <button
              onClick={onClearPending}
              className="text-xs font-semibold px-2 py-0.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--wt-text-muted)', background: 'var(--wt-surface-hover)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Trash drop zone — slides up from bottom while dragging */}
      <div
        style={{
          position:   'absolute',
          bottom:     draggingWidgetId ? 32 : -80,
          left:       '50%',
          transform:  'translateX(-50%)',
          zIndex:     9998,
          transition: 'bottom 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.2s',
          opacity:    draggingWidgetId ? 1 : 0,
          pointerEvents: draggingWidgetId ? 'none' : 'none',
        }}
      >
        <div
          ref={trashZoneRef}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            10,
            padding:        '12px 28px',
            borderRadius:   '9999px',
            background:     overTrash
              ? 'color-mix(in srgb, #ef4444 90%, black)'
              : 'color-mix(in srgb, var(--wt-bg) 92%, transparent)',
            border:         `1.5px solid ${overTrash ? '#ef4444' : 'var(--wt-border)'}`,
            boxShadow:      overTrash
              ? '0 0 0 4px rgba(239,68,68,0.18), 0 8px 24px rgba(0,0,0,0.25)'
              : '0 8px 24px rgba(0,0,0,0.18)',
            color:          overTrash ? '#fff' : 'var(--wt-text-muted)',
            transition:     'background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s',
            transform:      overTrash ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          <Icon icon="Trash" size={18} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>
            {overTrash ? 'Release to delete' : 'Drag here to delete'}
          </span>
        </div>
      </div>

      {widgets.map((widget) => {
        const typeDef      = getWidgetType(widget.type ?? '')
        const variant      = getWidgetVariant(widget.type ?? '', widget.variantId ?? 'default')
                             ?? typeDef?.variants[0]
        const Comp         = variant?.component
        const SettingsComp = variant?.settingsComponent

        // Use slot rect when widget is slot-assigned and slot exists in current layout
        const slotRect = widget.slotId ? slotMap[widget.slotId] : undefined
        const x        = slotRect?.x      ?? widget.x
        const y        = slotRect?.y      ?? widget.y
        const width    = slotRect?.width  ?? widget.width
        const height   = slotRect?.height ?? widget.height

        const content = Comp
          ? <Comp widgetId={widget.id} />
          : widget.type === 'calendar'
          ? <CalendarWidget widgetId={widget.id} />
          : <DatabaseWidget widgetId={widget.id} />

        return (
          <Widget
            key={widget.id}
            id={widget.id}
            x={x}
            y={y}
            width={width}
            height={height}
            settingsContent={SettingsComp ? <SettingsComp widgetId={widget.id} /> : undefined}
            preferences={variant?.preferences}
            refSize={variant?.scalable !== false ? (variant ? { width: variant.shape.width, height: variant.shape.height } : undefined) : undefined}
            slotAssigned={!!slotRect}
            layoutTransitioning={layoutTransitioning}
            onDoubleTap={onWidgetDoubleTap}
            onDragStart={() => {
              dragStartRef.current = { x, y, width, height, slotId: widget.slotId }
              setDraggingWidgetId(widget.id)
            }}
            onDragMove={(cx, cy) => handleDragMove(cx, cy)}
            onDragEnd={handleDragEnd}
            onDropped={(rect, cursorPt) => handleDropped(widget.id, rect, cursorPt)}
          >
            {content}
          </Widget>
        )
      })}
    </div>
  )
}
