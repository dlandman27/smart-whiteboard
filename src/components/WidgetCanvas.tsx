import { useEffect, useRef, useState } from 'react'
import { soundWidgetDrop, soundWidgetPickup } from '../lib/sounds'
import { Text } from '../ui/web'
import { useWhiteboardStore } from '../store/whiteboard'
import { useLayout } from '../hooks/useLayout'
import { Widget } from './Widget'
import { LayoutSlots } from './layout/LayoutSlots'
import { DatabaseWidget } from './widgets/DatabaseWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { getStaticWidgetDef } from './widgets/registry'
import type { PendingWidget } from '../types'

interface Props {
  slideDir:       'left' | 'right'
  activeTool:     string
  pendingWidget:  PendingWidget | null
  onClearPending: () => void
}

export function WidgetCanvas({ slideDir, activeTool, pendingWidget, onClearPending }: Props) {
  const { boards, activeBoardId, addWidget, updateLayout, assignSlot } = useWhiteboardStore()
  const { slotMap, layout } = useLayout()

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const rawWidgets  = boards[activeIndex]?.widgets ?? []
  const widgets     = rawWidgets.filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i)
  const isFreeform  = layout.slots.length === 0

  // Track which widget is being dragged and which slot is hovered
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null)
  const [hoveredSlotId,    setHoveredSlotId]    = useState<string | null>(null)
  const hoveredSlotRef   = useRef<string | null>(null)
  // Capture widget's original rect+slot before drag so we can snap back on miss
  const dragStartRef = useRef<{ x: number; y: number; width: number; height: number; slotId?: string } | null>(null)

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

  function handleDragMove(cx: number, cy: number) {
    const slotId = findSlotAtCenter(cx, cy)
    if (slotId !== hoveredSlotRef.current) {
      hoveredSlotRef.current = slotId
      setHoveredSlotId(slotId)
    }
  }

  function handleDragEnd() {
    soundWidgetDrop()
    setDraggingWidgetId(null)
    setHoveredSlotId(null)
    hoveredSlotRef.current = null
    dragStartRef.current   = null
  }

  // When a widget is dropped, snap to slot or swap with occupant
  function handleDropped(widgetId: string, rect: { x: number; y: number; width: number; height: number }, cursorPt: { x: number; y: number }) {
    const targetSlotId = findSlotAtCenter(cursorPt.x, cursorPt.y)

    if (!targetSlotId) {
      if (isFreeform) return  // position already updated by Widget on drag end
      // Missed all slots — snap back to where the drag started
      const origin = dragStartRef.current
      if (origin) {
        updateLayout(widgetId, { x: origin.x, y: origin.y, width: origin.width, height: origin.height })
        if (origin.slotId) assignSlot(widgetId, origin.slotId)
      }
      return
    }

    const targetSlotRect = slotMap[targetSlotId]
    if (!targetSlotRect) return

    // Check if another widget occupies the target slot
    const occupant = widgets.find((w) => w.id !== widgetId && w.slotId === targetSlotId)
    const draggedWidget = widgets.find((w) => w.id === widgetId)

    if (occupant) {
      // Swap: occupant gets dragged widget's old slot (or goes free)
      const draggedSlotId = draggedWidget?.slotId ?? null
      if (draggedSlotId && slotMap[draggedSlotId]) {
        const draggedSlotRect = slotMap[draggedSlotId]
        updateLayout(occupant.id, { x: draggedSlotRect.x, y: draggedSlotRect.y, width: draggedSlotRect.width, height: draggedSlotRect.height })
        assignSlot(occupant.id, draggedSlotId)
      } else {
        // Dragged was free-floating — occupant becomes free at current rect position
        updateLayout(occupant.id, rect)
        assignSlot(occupant.id, null)
      }
    }

    updateLayout(widgetId, { x: targetSlotRect.x, y: targetSlotRect.y, width: targetSlotRect.width, height: targetSlotRect.height })
    assignSlot(widgetId, targetSlotId)
  }

  function handleSlotClick(slotId: string) {
    if (!pendingWidget) return
    const rect = slotMap[slotId]
    if (!rect) return

    // If slot is occupied, displace the occupant to free-floating
    const occupant = widgets.find((w) => w.slotId === slotId)
    if (occupant) {
      updateLayout(occupant.id, { x: rect.x + 40, y: rect.y + 40, width: occupant.width, height: occupant.height })
      assignSlot(occupant.id, null)
    }

    addWidget({ ...pendingWidget, slotId, x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    onClearPending()
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!pendingWidget || !isFreeform) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left - pendingWidget.width / 2)
    const y = Math.max(0, e.clientY - rect.top  - pendingWidget.height / 2)
    addWidget({ ...pendingWidget, x, y, slotId: undefined })
    onClearPending()
  }

  return (
    <div
      key={activeBoardId}
      className={`absolute inset-0 ${slideDir === 'right' ? 'board-slide-right' : 'board-slide-left'}`}
      onClick={handleCanvasClick}
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
            <span>{isFreeform ? 'Click anywhere to place' : 'Click a slot to place'}</span>
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

      {widgets.map((widget) => {
        const def          = getStaticWidgetDef(widget.type ?? '')
        const Comp         = def?.component
        const SettingsComp = def?.settingsComponent

        // Use slot rect when widget is slot-assigned and slot exists in current layout
        const slotRect = widget.slotId ? slotMap[widget.slotId] : undefined
        const x        = slotRect?.x      ?? widget.x
        const y        = slotRect?.y      ?? widget.y
        const width    = slotRect?.width  ?? widget.width
        const height   = slotRect?.height ?? widget.height

        const content = Comp
          ? <Comp widgetId={widget.id} />
          : widget.type === 'calendar'
          ? <CalendarWidget calendarId={widget.calendarId ?? 'primary'} />
          : <DatabaseWidget databaseId={widget.databaseId ?? ''} />

        return (
          <Widget
            key={widget.id}
            id={widget.id}
            x={x}
            y={y}
            width={width}
            height={height}
            settingsContent={SettingsComp ? <SettingsComp widgetId={widget.id} /> : undefined}
            preferences={def?.preferences}
            refSize={def?.scalable !== false ? def?.defaultSize : undefined}
            slotAssigned={!!slotRect}
            onDragStart={() => {
              soundWidgetPickup()
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
