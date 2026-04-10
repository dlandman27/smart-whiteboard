import { useCallback, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, useWidgetSizeContext } from '@whiteboard/ui-kit'
import { getWidgetVariant } from './registry'
import type { WidgetProps } from './registry'

// ── Settings shape ──────────────────────────────────────────────────────────

export interface PaneConfig {
  type:      string
  variantId: string
  /** The sub-widget's settings, forwarded to the sub-component */
  settings?: Record<string, unknown>
  [key: string]: unknown
}

export interface SplitWidgetSettings {
  orientation: 'horizontal' | 'vertical'
  /** 0–100, percentage of the first pane */
  split: number
  paneA: PaneConfig | null
  paneB: PaneConfig | null
  [key: string]: unknown
}

export const DEFAULT_SPLIT_SETTINGS: SplitWidgetSettings = {
  orientation: 'horizontal',
  split:       50,
  paneA:       null,
  paneB:       null,
}

// ── Sub-widget renderer ─────────────────────────────────────────────────────

function SplitPane({
  pane,
  widgetId,
  paneKey,
  style,
}: {
  pane: PaneConfig | null
  widgetId: string
  paneKey: 'paneA' | 'paneB'
  style: React.CSSProperties
}) {
  if (!pane) {
    return (
      <div style={style} className="flex items-center justify-center">
        <span
          className="text-xs font-medium opacity-40"
          style={{ color: 'var(--wt-text-muted)' }}
        >
          Empty — pick a widget in settings
        </span>
      </div>
    )
  }

  const variant = getWidgetVariant(pane.type, pane.variantId)
  if (!variant) {
    return (
      <div style={style} className="flex items-center justify-center">
        <span className="text-xs opacity-40" style={{ color: 'var(--wt-text-muted)' }}>
          Widget not found
        </span>
      </div>
    )
  }

  // Use a namespaced widgetId so each pane's useWidgetSettings reads from the
  // correct slice.  The actual settings for sub-widgets are stored on the split
  // widget itself under `paneA.settings` / `paneB.settings` — we forward them
  // by giving the component a synthetic ID of `{splitId}::${paneKey}`.
  const Comp = variant.component
  return (
    <div style={{ ...style, overflow: 'hidden', position: 'relative' }}>
      <Container className="w-full h-full">
        <Comp widgetId={`${widgetId}::${paneKey}`} />
      </Container>
    </div>
  )
}

// ── Draggable divider ───────────────────────────────────────────────────────

function Divider({
  orientation,
  onDrag,
  onDragEnd,
}: {
  orientation: 'horizontal' | 'vertical'
  onDrag: (delta: number) => void
  onDragEnd: () => void
}) {
  const dragging = useRef(false)
  const lastPos  = useRef(0)

  const isH = orientation === 'horizontal'

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    lastPos.current = isH ? e.clientX : e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [isH])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const pos   = isH ? e.clientX : e.clientY
    const delta = pos - lastPos.current
    lastPos.current = pos
    onDrag(delta)
  }, [isH, onDrag])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    onDragEnd()
  }, [onDragEnd])

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        [isH ? 'width' : 'height']: 8,
        [isH ? 'minWidth' : 'minHeight']: 8,
        cursor: isH ? 'col-resize' : 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          [isH ? 'width' : 'height']: 3,
          [isH ? 'height' : 'width']: 32,
          borderRadius: 2,
          background: 'var(--wt-border)',
          opacity: 0.6,
          transition: 'opacity 150ms',
        }}
      />
    </div>
  )
}

// ── Main widget ─────────────────────────────────────────────────────────────

export function SplitWidget({ widgetId }: WidgetProps) {
  return (
    <Container>
      <SplitContent widgetId={widgetId} />
    </Container>
  )
}

function SplitContent({ widgetId }: WidgetProps) {
  const [settings, set] = useWidgetSettings<SplitWidgetSettings>(widgetId, DEFAULT_SPLIT_SETTINGS)
  const { containerWidth, containerHeight } = useWidgetSizeContext()

  const isH   = settings.orientation === 'horizontal'
  const total = isH ? containerWidth : containerHeight
  const split = Math.max(10, Math.min(90, settings.split))

  // Local drag state for smooth divider resizing
  const [localSplit, setLocalSplit] = useState<number | null>(null)
  const activeSplit = localSplit ?? split

  const DIVIDER = 8
  const paneASize = (activeSplit / 100) * (total - DIVIDER)

  const onDrag = useCallback((delta: number) => {
    const pxPercent = (delta / (total - DIVIDER)) * 100
    setLocalSplit((prev) => {
      const next = (prev ?? split) + pxPercent
      return Math.max(10, Math.min(90, next))
    })
  }, [total, split])

  const onDragEnd = useCallback(() => {
    if (localSplit !== null) {
      set({ split: Math.round(localSplit * 10) / 10 })
      setLocalSplit(null)
    }
  }, [localSplit, set])

  const paneAStyle: React.CSSProperties = isH
    ? { width: paneASize, height: '100%', flexShrink: 0 }
    : { width: '100%', height: paneASize, flexShrink: 0 }

  const paneBStyle: React.CSSProperties = isH
    ? { flex: 1, height: '100%', minWidth: 0 }
    : { flex: 1, width: '100%', minHeight: 0 }

  return (
    <div
      className="w-full h-full flex"
      style={{ flexDirection: isH ? 'row' : 'column' }}
    >
      <SplitPane pane={settings.paneA} widgetId={widgetId} paneKey="paneA" style={paneAStyle} />
      <Divider orientation={settings.orientation} onDrag={onDrag} onDragEnd={onDragEnd} />
      <SplitPane pane={settings.paneB} widgetId={widgetId} paneKey="paneB" style={paneBStyle} />
    </div>
  )
}
