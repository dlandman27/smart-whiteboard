import { useEffect, useRef, useState } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { LAYOUT_PRESETS, getLayoutPreset } from '../layouts/presets'
import { useWhiteboardStore } from '../store/whiteboard'
import { useUIStore } from '../store/ui'
import { computeSlotRect, DEFAULT_SLOT_GAP, DEFAULT_SLOT_PAD } from '../hooks/useLayout'
import { getStaticWidgetDef } from './widgets/registry'
import type { Layout, LayoutSlot } from '../types'
import type { WidgetLayout } from '../types'

interface Props { onClose: () => void }

// ── helpers ───────────────────────────────────────────────────────────────────

function widgetLabel(w: WidgetLayout): string {
  if (w.type) {
    const def = getStaticWidgetDef(w.type)
    if (def) return def.label
  }
  if ((w as any).databaseId) return 'Database'
  return w.type ?? 'Widget'
}

function widgetIcon(w: WidgetLayout): string {
  if (w.type) {
    const def = getStaticWidgetDef(w.type)
    if (def) return def.Icon
  }
  return 'SquaresFour'
}

// ── Step 1: layout grid ───────────────────────────────────────────────────────

function SlotPreview({ slots }: { slots: LayoutSlot[] }) {
  return (
    <div className="relative w-full h-full">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="absolute"
          style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, width: `${slot.width * 100}%`, height: `${slot.height * 100}%`, padding: 2 }}
        >
          <div className="w-full h-full rounded-sm" style={{ background: 'var(--wt-accent)', opacity: 0.5 }} />
        </div>
      ))}
    </div>
  )
}

interface LayoutGridProps {
  currentLayoutId: string | undefined
  onSelect: (layout: Layout) => void
  onClose:  () => void
}

function LayoutGrid({ currentLayoutId, onSelect, onClose }: LayoutGridProps) {
  const visiblePresets = LAYOUT_PRESETS.filter((l) => l.id !== 'custom')
  return (
    <>
      <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ height: 56, borderBottom: '1px solid var(--wt-border)' }}>
        <div className="flex items-center gap-2.5">
          <Icon icon="SquaresFour" size={18} style={{ color: 'var(--wt-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>Change Layout</span>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div className="overflow-y-auto p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {visiblePresets.map((layout) => {
          const isActive = currentLayoutId === layout.id
          return (
            <button
              key={layout.id}
              onClick={() => onSelect(layout)}
              className="flex flex-col gap-2 rounded-xl p-3 text-left"
              style={{
                background: isActive ? 'color-mix(in srgb, var(--wt-accent) 14%, transparent)' : 'var(--wt-surface)',
                border: isActive ? '1.5px solid var(--wt-accent)' : '1.5px solid var(--wt-border)',
                cursor: 'pointer',
              }}
              onPointerEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--wt-surface-hover)' }}
              onPointerLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--wt-surface)' }}
            >
              <div className="w-full rounded-lg overflow-hidden relative" style={{ aspectRatio: '16/9', background: 'var(--wt-bg)', border: '1px solid var(--wt-border)' }}>
                {layout.slots.length === 0
                  ? <div className="absolute inset-0 flex items-center justify-center"><Icon icon="DotsSixVertical" size={18} style={{ opacity: 0.25 }} /></div>
                  : <SlotPreview slots={layout.slots} />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: isActive ? 'var(--wt-accent)' : 'var(--wt-text)' }}>{layout.name}</span>
                {isActive && <Icon icon="CheckCircle" size={13} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ── Step 2: visual slot assignment ────────────────────────────────────────────

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-lg"
      style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)' }}
      onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
      onPointerLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon icon="X" size={15} />
    </button>
  )
}

interface AssignStepProps {
  layout:  Layout
  widgets: WidgetLayout[]
  onBack:  () => void
  onApply: (assignments: Record<string, string | null>) => void
  onClose: () => void
}

function WidgetChip({
  widget, dragging, onDragStart, onDragEnd,
}: {
  widget: WidgetLayout
  dragging: boolean
  onDragStart: () => void
  onDragEnd:   () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('widgetId', widget.id); onDragStart() }}
      onDragEnd={onDragEnd}
      className="flex items-center gap-2 px-3 py-2 rounded-xl select-none"
      style={{
        background:  dragging ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'var(--wt-surface)',
        border:      `1.5px solid ${dragging ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        cursor:      'grab',
        opacity:     dragging ? 0.5 : 1,
        transition:  'opacity 0.15s',
        flexShrink:  0,
      }}
    >
      <Icon icon={widgetIcon(widget)} size={13} style={{ opacity: 0.65, flexShrink: 0 }} />
      <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--wt-text)' }}>
        {widgetLabel(widget)}
      </span>
    </div>
  )
}

function AssignStep({ layout, widgets, onBack, onApply, onClose }: AssignStepProps) {
  // slotId → widgetId ('' = empty)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    layout.slots.forEach((slot, i) => { init[slot.id] = widgets[i]?.id ?? '' })
    return init
  })
  const [draggingId,  setDraggingId]  = useState<string | null>(null)
  const [hoverSlot,   setHoverSlot]   = useState<string | null>(null)
  const [hoverPool,   setHoverPool]   = useState(false)

  const assignedIds = new Set(Object.values(assignments).filter(Boolean))
  const poolWidgets = widgets.filter((w) => !assignedIds.has(w.id))

  function assignToSlot(slotId: string, widgetId: string) {
    setAssignments((prev) => {
      const next      = { ...prev }
      const prevSlot  = Object.entries(prev).find(([sid, wid]) => wid === widgetId && sid !== slotId)?.[0] ?? null
      const displaced = prev[slotId]  // widget already sitting in the target slot
      // Clear any slot that currently holds the dragged widget
      for (const sid of Object.keys(next)) {
        if (next[sid] === widgetId) next[sid] = ''
      }
      // If target slot had a widget and dragged came from another slot → swap
      if (displaced && prevSlot) next[prevSlot] = displaced
      next[slotId] = widgetId
      return next
    })
  }

  function removeFromSlot(slotId: string) {
    setAssignments((prev) => ({ ...prev, [slotId]: '' }))
  }

  function handleDropOnSlot(e: React.DragEvent, slotId: string) {
    e.preventDefault()
    const widgetId = e.dataTransfer.getData('widgetId')
    if (widgetId) assignToSlot(slotId, widgetId)
    setHoverSlot(null)
    setDraggingId(null)
  }

  function handleDropOnPool(e: React.DragEvent) {
    e.preventDefault()
    const widgetId = e.dataTransfer.getData('widgetId')
    if (widgetId) {
      setAssignments((prev) => {
        const next = { ...prev }
        for (const sid of Object.keys(next)) { if (next[sid] === widgetId) next[sid] = '' }
        return next
      })
    }
    setHoverPool(false)
    setDraggingId(null)
  }

  const unassigned = widgets.filter((w) => !assignedIds.has(w.id))

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ height: 56, borderBottom: '1px solid var(--wt-border)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)' }}
            onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
            onPointerLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Icon icon="ArrowLeft" size={15} />
          </button>
          <Icon icon="ArrowsLeftRight" size={18} style={{ color: 'var(--wt-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>Assign Widgets</span>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4 overflow-y-auto">

        {/* Visual layout canvas */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: '16/9', background: 'var(--wt-bg)', border: '1px solid var(--wt-border)' }}
        >
          {layout.slots.map((slot) => {
            const widgetId  = assignments[slot.id] ?? ''
            const widget    = widgets.find((w) => w.id === widgetId)
            const isHovered = hoverSlot === slot.id

            return (
              <div
                key={slot.id}
                onDragOver={(e) => { e.preventDefault(); setHoverSlot(slot.id) }}
                onDragLeave={() => setHoverSlot(null)}
                onDrop={(e) => handleDropOnSlot(e, slot.id)}
                className="absolute flex items-center justify-center"
                style={{
                  left:         `${slot.x * 100}%`,
                  top:          `${slot.y * 100}%`,
                  width:        `${slot.width * 100}%`,
                  height:       `${slot.height * 100}%`,
                  padding:      4,
                }}
              >
                <div
                  className="w-full h-full rounded-lg flex flex-col items-center justify-center gap-1.5 relative transition-colors"
                  style={{
                    background:  isHovered
                      ? 'color-mix(in srgb, var(--wt-accent) 18%, transparent)'
                      : widget
                      ? 'color-mix(in srgb, var(--wt-accent) 10%, var(--wt-surface))'
                      : 'color-mix(in srgb, var(--wt-text) 5%, transparent)',
                    border: `1.5px ${isHovered ? 'solid' : widget ? 'solid' : 'dashed'} ${isHovered ? 'var(--wt-accent)' : widget ? 'color-mix(in srgb, var(--wt-accent) 35%, transparent)' : 'color-mix(in srgb, var(--wt-border) 80%, transparent)'}`,
                  }}
                >
                  {widget ? (
                    <>
                      {/* Remove button */}
                      <button
                        onClick={() => removeFromSlot(slot.id)}
                        className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-md opacity-0 hover:opacity-100 transition-opacity"
                        style={{ width: 18, height: 18, background: 'var(--wt-surface-hover)', border: 'none', cursor: 'pointer', color: 'var(--wt-text-muted)' }}
                        onPointerEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        <Icon icon="X" size={10} />
                      </button>

                      {/* Widget chip — draggable from slot */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('widgetId', widget.id)
                          setDraggingId(widget.id)
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className="flex flex-col items-center gap-1 cursor-grab select-none px-2"
                        style={{ opacity: draggingId === widget.id ? 0.4 : 1 }}
                      >
                        <Icon icon={widgetIcon(widget)} size={18} style={{ color: 'var(--wt-accent)', opacity: 0.8 }} />
                        <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: 'var(--wt-text)' }}>
                          {widgetLabel(widget)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
                      <Icon icon="Plus" size={14} style={{ opacity: 0.25 }} />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}>
                        drop here
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Widget pool */}
        <div
          onDragOver={(e) => { e.preventDefault(); setHoverPool(true) }}
          onDragLeave={() => setHoverPool(false)}
          onDrop={handleDropOnPool}
          className="rounded-xl p-3 transition-colors"
          style={{
            background:  hoverPool ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)' : 'var(--wt-surface)',
            border:      `1.5px ${hoverPool ? 'solid' : 'dashed'} ${hoverPool ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
            minHeight:   52,
          }}
        >
          {poolWidgets.length === 0 ? (
            <div className="flex items-center justify-center h-8">
              <span className="text-xs" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}>
                {widgets.length === 0 ? 'No widgets on this board' : 'All widgets assigned'}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {poolWidgets.map((w) => (
                <WidgetChip
                  key={w.id}
                  widget={w}
                  dragging={draggingId === w.id}
                  onDragStart={() => setDraggingId(w.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Removal warning */}
        {unassigned.length > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              background: 'color-mix(in srgb, var(--wt-danger) 8%, transparent)',
              border:     '1px solid color-mix(in srgb, var(--wt-danger) 25%, transparent)',
            }}
          >
            <Icon icon="Warning" size={15} style={{ color: 'var(--wt-danger)', flexShrink: 0, marginTop: 1 }} />
            <span className="text-xs" style={{ color: 'var(--wt-danger)' }}>
              <strong>{unassigned.length} widget{unassigned.length > 1 ? 's' : ''} will be removed:</strong>{' '}
              {unassigned.map((w) => widgetLabel(w)).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--wt-border)' }}>
        <button
          onClick={onBack}
          className="text-sm font-medium px-4 py-2 rounded-xl"
          style={{ background: 'var(--wt-surface)', border: '1px solid var(--wt-border)', cursor: 'pointer', color: 'var(--wt-text)' }}
          onPointerEnter={(e) => (e.currentTarget.style.background = 'var(--wt-surface-hover)')}
          onPointerLeave={(e) => (e.currentTarget.style.background = 'var(--wt-surface)')}
        >
          Back
        </button>
        <button
          onClick={() => {
            const result: Record<string, string | null> = {}
            for (const [slotId, wid] of Object.entries(assignments)) result[slotId] = wid || null
            onApply(result)
          }}
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--wt-accent)', border: 'none', cursor: 'pointer', color: 'var(--wt-accent-text)' }}
          onPointerEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onPointerLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Apply layout
        </button>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LayoutPicker({ onClose }: Props) {
  const { activeBoardId, boards, setLayout, removeWidget } = useWhiteboardStore()
  const { canvasSize } = useUIStore()
  const activeBoard = boards.find((b) => b.id === activeBoardId)
  const overlayRef  = useRef<HTMLDivElement>(null)

  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { selectedLayout ? setSelectedLayout(null) : onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, selectedLayout])

  function handleLayoutSelect(layout: Layout) {
    if (!activeBoard) return

    if (layout.slots.length === 0) {
      // Freeform — strip slot assignments, keep positions
      const widgetUpdates = (activeBoard.widgets ?? []).map((w) => ({
        id: w.id, slotId: null, x: w.x, y: w.y, width: w.width, height: w.height,
      }))
      setLayout(activeBoardId, layout.id, widgetUpdates)
      onClose()
      return
    }

    if (!activeBoard.widgets?.length) {
      setLayout(activeBoardId, layout.id)
      onClose()
      return
    }

    setSelectedLayout(layout)
  }

  function handleApply(assignments: Record<string, string | null>) {
    if (!selectedLayout || !activeBoard) return

    const slotGap = activeBoard.slotGap ?? DEFAULT_SLOT_GAP
    const slotPad = activeBoard.slotPad ?? DEFAULT_SLOT_PAD
    const widgets = activeBoard.widgets ?? []

    const slotRects = Object.fromEntries(
      selectedLayout.slots.map((s) => [s.id, computeSlotRect(s, canvasSize.w, canvasSize.h, slotGap, slotPad)])
    )

    const assignedIds = new Set(Object.values(assignments).filter(Boolean) as string[])

    const widgetUpdates = widgets
      .filter((w) => assignedIds.has(w.id))
      .map((w) => {
        const slotId = Object.entries(assignments).find(([, wid]) => wid === w.id)?.[0] ?? null
        const rect   = slotId ? slotRects[slotId] : null
        return {
          id: w.id, slotId: slotId ?? null,
          x: rect?.x ?? w.x, y: rect?.y ?? w.y,
          width: rect?.width ?? w.width, height: rect?.height ?? w.height,
        }
      })

    setLayout(activeBoardId, selectedLayout.id, widgetUpdates)
    widgets.filter((w) => !assignedIds.has(w.id)).forEach((w) => removeWidget(w.id))
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[10002] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onPointerDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 560, maxHeight: '85vh',
          backgroundColor: 'var(--wt-settings-bg)',
          border: '1px solid var(--wt-settings-border)',
          boxShadow: 'var(--wt-shadow-lg)',
        }}
      >
        {selectedLayout ? (
          <AssignStep
            layout={selectedLayout}
            widgets={activeBoard?.widgets ?? []}
            onBack={() => setSelectedLayout(null)}
            onApply={handleApply}
            onClose={onClose}
          />
        ) : (
          <LayoutGrid
            currentLayoutId={activeBoard?.layoutId}
            onSelect={handleLayoutSelect}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
