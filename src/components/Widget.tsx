import { useEffect, useRef, useState } from 'react'
import { GripHorizontal, Settings, X } from 'lucide-react'
import { useWhiteboardStore } from '../store/whiteboard'
import { Icon } from '../ui/web'
import type { PluginPreference } from '@whiteboard/sdk'

// ── Preference fields ─────────────────────────────────────────────────────────

function PreferenceFields({ widgetId, preferences }: { widgetId: string; preferences: PluginPreference[] }) {
  const raw            = useWhiteboardStore((s) =>
    s.boards.find((b) => b.id === s.activeBoardId)?.widgets.find((w) => w.id === widgetId)?.settings
  ) ?? {}
  const updateSettings = useWhiteboardStore((s) => s.updateSettings)

  return (
    <div className="space-y-3">
      {preferences.map((pref) => (
        <div key={pref.name} className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--wt-settings-label)' }}>
            {pref.title}
            {pref.required && <span className="text-red-400">*</span>}
          </label>
          {pref.description && (
            <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>{pref.description}</p>
          )}
          <input
            type={pref.type === 'password' ? 'password' : 'text'}
            value={(raw[pref.name] as string) ?? ''}
            onChange={(e) => updateSettings(widgetId, { [pref.name]: e.target.value })}
            placeholder={pref.placeholder ?? ''}
            className="wt-input w-full px-3 py-1.5 text-sm rounded-lg"
          />
        </div>
      ))}
    </div>
  )
}

const GRID_SIZE       = 28
const LONG_PRESS_MS   = 400
const LONG_PRESS_MOVE = 10
const PANEL_WIDTH     = 272
const GAP             = 10
const ACTION_W        = 40
const CLOSE_MS        = 130
const MIN_W           = 200
const MIN_H           = 140
const HANDLE_HIT      = 44   // px — touch target for resize handles

// Monotonically increasing counter — each activation gets a unique z-order
let zCounter = 10

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 's' | 'n' | 'e' | 'w'

const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: 'n-resize', s: 's-resize',
  e: 'e-resize', w: 'w-resize',
  ne: 'ne-resize', sw: 'sw-resize',
  nw: 'nw-resize', se: 'se-resize',
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

interface Props {
  id:               string
  x:                number
  y:                number
  width:            number
  height:           number
  children:         React.ReactNode
  settingsContent?: React.ReactNode
  preferences?:     PluginPreference[]
  refSize?:         { width: number; height: number }
}

export function Widget({ id, x, y, width, height, children, settingsContent, preferences, refSize }: Props) {
  const { updateLayout, removeWidget } = useWhiteboardStore()

  const [active,       setActive]       = useState(false)
  const [zOrder,       setZOrder]       = useState(0)
  const [dragging,     setDragging]     = useState(false)
  const [resizing,     setResizing]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isClosing,    setIsClosing]    = useState(false)
  const [pos,  setPos]  = useState({ x, y })
  const [size, setSize] = useState({ width, height })

  const containerRef   = useRef<HTMLDivElement>(null)
  const panelRef       = useRef<HTMLDivElement>(null)
  const closeTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressOrigin = useRef({ x: 0, y: 0 })
  const longPressId    = useRef<number | null>(null)

  // Refs mirror state so event handler closures stay fresh
  const posRef  = useRef({ x, y })
  const sizeRef = useRef({ width, height })
  const ctrlRef = useRef(false)

  // Strip drag state (captured on drag handle)
  const stripDrag = useRef<{
    pointerId: number
    startCX: number; startCY: number
    startX:  number; startY:  number
  } | null>(null)

  // Resize state (captured on resize handle)
  const resizeDrag = useRef<{
    pointerId: number
    handle:    ResizeHandle
    startCX:   number; startCY: number
    startX:    number; startY:  number
    startW:    number; startH:  number
  } | null>(null)

  // Body drag cleanup (document listeners added by long-press)
  const bodyCleanup = useRef<(() => void) | null>(null)

  // Sync refs when props change (external store update)
  useEffect(() => { setPos({ x, y });         posRef.current  = { x, y }         }, [x, y])
  useEffect(() => { setSize({ width, height }); sizeRef.current = { width, height } }, [width, height])

  // Ctrl key for grid snap
  useEffect(() => {
    function onKey(e: KeyboardEvent) { ctrlRef.current = e.ctrlKey }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup',   onKey)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey) }
  }, [])

  // Deactivate when tapping outside on touch devices
  useEffect(() => {
    if (!active || showSettings) return
    function onDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setActive(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active, showSettings])

  // Close settings when clicking outside panel
  useEffect(() => {
    if (!showSettings) return
    function onDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeSettings()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showSettings])

  // Cleanup on unmount
  useEffect(() => () => {
    bodyCleanup.current?.()
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (closeTimer.current)     clearTimeout(closeTimer.current)
  }, [])

  function raise() { setZOrder(++zCounter) }

  // ── Settings ──────────────────────────────────────────────────────
  function openSettings() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setIsClosing(false)
    setShowSettings(true)
  }
  function closeSettings() {
    setIsClosing(true)
    closeTimer.current = setTimeout(() => { setShowSettings(false); setIsClosing(false) }, CLOSE_MS)
  }
  function toggleSettings() {
    if (showSettings && !isClosing) closeSettings()
    else openSettings()
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function calcDragPos(
    startX: number, startY: number,
    startCX: number, startCY: number,
    clientX: number, clientY: number,
  ) {
    let newX = startX + (clientX - startCX)
    let newY = startY + (clientY - startCY)
    if (ctrlRef.current) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE
    }
    const p = containerRef.current?.parentElement
    if (p) {
      newX = clamp(newX, 0, p.clientWidth  - sizeRef.current.width)
      newY = clamp(newY, 0, p.clientHeight - sizeRef.current.height)
    }
    return { x: newX, y: newY }
  }

  function calcResizeResult(
    handle: ResizeHandle,
    startX: number, startY: number, startW: number, startH: number,
    startCX: number, startCY: number,
    clientX: number, clientY: number,
  ) {
    const dx = clientX - startCX
    const dy = clientY - startCY
    let newX = startX, newY = startY, newW = startW, newH = startH

    if (handle.includes('e')) newW = Math.max(MIN_W, startW + dx)
    if (handle.includes('w')) { newW = Math.max(MIN_W, startW - dx); newX = startX + (startW - newW) }
    if (handle.includes('s')) newH = Math.max(MIN_H, startH + dy)
    if (handle.includes('n')) { newH = Math.max(MIN_H, startH - dy); newY = startY + (startH - newH) }

    const p = containerRef.current?.parentElement
    if (p) {
      if (newX < 0) { newW += newX; newX = 0 }
      if (newY < 0) { newH += newY; newY = 0 }
      newW = Math.min(newW, p.clientWidth  - newX)
      newH = Math.min(newH, p.clientHeight - newY)
    }
    return { x: newX, y: newY, width: newW, height: newH }
  }

  // ── Drag strip handlers ───────────────────────────────────────────
  function onStripDown(e: React.PointerEvent) {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    stripDrag.current = {
      pointerId: e.pointerId,
      startCX: e.clientX, startCY: e.clientY,
      startX: posRef.current.x, startY: posRef.current.y,
    }
    setDragging(true)
    setActive(true)
    raise()
  }
  function onStripMove(e: React.PointerEvent) {
    if (!stripDrag.current || e.pointerId !== stripDrag.current.pointerId) return
    const { startX, startY, startCX, startCY } = stripDrag.current
    const np = calcDragPos(startX, startY, startCX, startCY, e.clientX, e.clientY)
    posRef.current = np
    setPos(np)
  }
  function onStripUp(e: React.PointerEvent) {
    if (!stripDrag.current || e.pointerId !== stripDrag.current.pointerId) return
    const { startX, startY, startCX, startCY } = stripDrag.current
    updateLayout(id, calcDragPos(startX, startY, startCX, startCY, e.clientX, e.clientY))
    stripDrag.current = null
    setDragging(false)
  }

  // ── Body long-press drag ──────────────────────────────────────────
  function onBodyDown(e: React.PointerEvent) {
    longPressOrigin.current = { x: e.clientX, y: e.clientY }
    longPressId.current     = e.pointerId

    longPressTimer.current = setTimeout(() => {
      const pid = longPressId.current
      if (pid === null) return

      setActive(true)
      setDragging(true)
      raise()

      const startX  = posRef.current.x
      const startY  = posRef.current.y
      const startCX = longPressOrigin.current.x
      const startCY = longPressOrigin.current.y

      function onMove(ev: PointerEvent) {
        if (ev.pointerId !== pid) return
        const np = calcDragPos(startX, startY, startCX, startCY, ev.clientX, ev.clientY)
        posRef.current = np
        setPos(np)
      }
      function onUp(ev: PointerEvent) {
        if (ev.pointerId !== pid) return
        updateLayout(id, calcDragPos(startX, startY, startCX, startCY, ev.clientX, ev.clientY))
        bodyCleanup.current?.()
        bodyCleanup.current = null
        setDragging(false)
      }

      function onCancel(ev: PointerEvent) {
        if (ev.pointerId !== pid) return
        // pointercancel has unreliable coordinates (often 0,0) — restore to original position
        posRef.current = { x: startX, y: startY }
        setPos({ x: startX, y: startY })
        bodyCleanup.current?.()
        bodyCleanup.current = null
        setDragging(false)
      }

      bodyCleanup.current = () => {
        document.removeEventListener('pointermove',   onMove)
        document.removeEventListener('pointerup',     onUp)
        document.removeEventListener('pointercancel', onCancel)
      }
      document.addEventListener('pointermove',   onMove)
      document.addEventListener('pointerup',     onUp)
      document.addEventListener('pointercancel', onCancel)
    }, LONG_PRESS_MS)
  }

  function onBodyMove(e: React.PointerEvent) {
    if (!longPressTimer.current || e.pointerId !== longPressId.current) return
    const dx = e.clientX - longPressOrigin.current.x
    const dy = e.clientY - longPressOrigin.current.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE * LONG_PRESS_MOVE) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function onBodyUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      // Short tap — activate widget (shows controls + resize handles)
      setActive(true)
      raise()
    }
    longPressId.current = null
  }

  // ── Resize handle handlers ────────────────────────────────────────
  function onResizeDown(handle: ResizeHandle, e: React.PointerEvent) {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    resizeDrag.current = {
      pointerId: e.pointerId,
      handle,
      startCX: e.clientX, startCY: e.clientY,
      startX: posRef.current.x,      startY: posRef.current.y,
      startW: sizeRef.current.width, startH: sizeRef.current.height,
    }
    setResizing(true)
    setActive(true)
    raise()
  }
  function onResizeMove(e: React.PointerEvent) {
    if (!resizeDrag.current || e.pointerId !== resizeDrag.current.pointerId) return
    const { handle, startX, startY, startW, startH, startCX, startCY } = resizeDrag.current
    const r = calcResizeResult(handle, startX, startY, startW, startH, startCX, startCY, e.clientX, e.clientY)
    posRef.current  = { x: r.x, y: r.y }
    sizeRef.current = { width: r.width, height: r.height }
    setPos({ x: r.x, y: r.y })
    setSize({ width: r.width, height: r.height })
  }
  function onResizeUp(e: React.PointerEvent) {
    if (!resizeDrag.current || e.pointerId !== resizeDrag.current.pointerId) return
    const { handle, startX, startY, startW, startH, startCX, startCY } = resizeDrag.current
    updateLayout(id, calcResizeResult(handle, startX, startY, startW, startH, startCX, startCY, e.clientX, e.clientY))
    resizeDrag.current = null
    setResizing(false)
  }

  // ── Render ────────────────────────────────────────────────────────
  const hasPrefs   = !!(preferences && preferences.length > 0)
  const hasSettings = !!(settingsContent || hasPrefs)
  const isActive   = active || showSettings
  const openRight  = pos.x + size.width + GAP + ACTION_W + GAP + PANEL_WIDTH + 12 < window.innerWidth
  const actionLeft = openRight ? size.width + GAP : -(GAP + ACTION_W)
  const panelMaxH  = Math.min(Math.max(size.height, 320), window.innerHeight - 40)
  const panelTop   = Math.min(0, window.innerHeight - 12 - pos.y - panelMaxH)
  const panelLeft  = openRight
    ? size.width + GAP + ACTION_W + GAP
    : -(GAP + ACTION_W + GAP + PANEL_WIDTH)
  const animClass  = isClosing
    ? (openRight ? 'settings-close-right' : 'settings-close-left')
    : (openRight ? 'settings-open-right'  : 'settings-open-left')
  const scale = refSize ? Math.min(size.width / refSize.width, size.height / refSize.height) : 1

  const handles: ResizeHandle[] = ['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: pos.x,
        top:  pos.y,
        width:  size.width,
        height: size.height,
        zIndex: zOrder + (dragging || resizing ? 3 : showSettings ? 2 : isActive ? 1 : 0),
        touchAction: dragging ? 'none' : undefined,
      }}
      onPointerDown={onBodyDown}
      onPointerMove={onBodyMove}
      onPointerUp={onBodyUp}
      onPointerCancel={onBodyUp}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => { if (!showSettings && !dragging && !resizing) setActive(false) }}
    >
      {/* Widget frame — content fills the entire frame, no overlapping header */}
      <div
        className={`w-full h-full rounded-2xl overflow-hidden border transition-all duration-150 ${dragging || resizing ? 'scale-[1.01]' : ''}`}
        style={{
          backgroundColor: 'var(--wt-bg)',
          backdropFilter:  'var(--wt-backdrop)',
          borderColor:     (dragging || resizing || isActive) ? 'var(--wt-border-active)' : 'var(--wt-border)',
          boxShadow:       dragging || resizing ? 'var(--wt-shadow-lg)' : isActive ? 'var(--wt-shadow-md)' : 'var(--wt-shadow-sm)',
        }}
      >
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <div style={{
            width:           refSize ? refSize.width  : '100%',
            height:          refSize ? refSize.height : '100%',
            transform:       scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center',
            flexShrink:      0,
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* Floating action panel — tap to reveal, to the side */}
      {isActive && (
        <div
          className="absolute flex flex-col gap-1 p-1 rounded-xl"
          style={{
            top: 0, left: actionLeft, width: ACTION_W, zIndex: 20,
            backgroundColor: 'var(--wt-action-bg)',
            border:          '1px solid var(--wt-action-border)',
            boxShadow:       'var(--wt-shadow-md)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div
            data-drag-handle
            className="wt-action-btn cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={onStripDown}
            onPointerMove={onStripMove}
            onPointerUp={onStripUp}
            onPointerCancel={onStripUp}
          >
            <Icon icon={GripHorizontal} size={13} />
          </div>

          {hasSettings && (
            <button className="wt-action-btn" onClick={toggleSettings}>
              <Icon icon={Settings} size={13} />
            </button>
          )}

          <button className="wt-action-btn wt-action-btn-danger" onClick={() => removeWidget(id)}>
            <Icon icon={X} size={13} />
          </button>
        </div>
      )}

      {/* Resize handles — outside the overflow:hidden frame so they aren't clipped */}
      {handles.map((handle) => {
        const H = HANDLE_HIT
        const style: React.CSSProperties = {
          position: 'absolute',
          cursor:      RESIZE_CURSORS[handle],
          touchAction: 'none',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          zIndex: 11,
        }
        if (handle === 'n')  { style.top = -H/2;    style.left = '50%'; style.transform = 'translateX(-50%)'; style.width = 80; style.height = H }
        if (handle === 's')  { style.bottom = -H/2; style.left = '50%'; style.transform = 'translateX(-50%)'; style.width = 80; style.height = H }
        if (handle === 'e')  { style.right = -H/2;  style.top = '50%';  style.transform = 'translateY(-50%)'; style.width = H;  style.height = 80 }
        if (handle === 'w')  { style.left = -H/2;   style.top = '50%';  style.transform = 'translateY(-50%)'; style.width = H;  style.height = 80 }
        if (handle === 'ne') { style.top = -H/2;    style.right = -H/2; style.width = H; style.height = H }
        if (handle === 'nw') { style.top = -H/2;    style.left  = -H/2; style.width = H; style.height = H }
        if (handle === 'se') { style.bottom = -H/2; style.right = -H/2; style.width = H; style.height = H }
        if (handle === 'sw') { style.bottom = -H/2; style.left  = -H/2; style.width = H; style.height = H }

        return (
          <div
            key={handle}
            data-resize-handle
            style={style}
            onPointerDown={(e) => onResizeDown(handle, e)}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={onResizeUp}
          >
            {handle.length === 2 && (
              <div
                className={`w-3 h-3 rounded-sm border-2 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                style={{ backgroundColor: 'var(--wt-bg)', borderColor: 'var(--wt-border-active)' }}
              />
            )}
            {handle.length === 1 && (
              <div
                className={`rounded-full transition-opacity duration-150 ${handle === 'n' || handle === 's' ? 'w-8 h-1' : 'w-1 h-8'} ${isActive ? 'opacity-100' : 'opacity-0'}`}
                style={{ backgroundColor: 'var(--wt-border-active)' }}
              />
            )}
          </div>
        )
      })}

      {/* Settings panel */}
      {showSettings && hasSettings && (
        <div
          ref={panelRef}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute rounded-2xl flex flex-col overflow-hidden wt-settings-panel ${animClass}`}
          style={{
            width: PANEL_WIDTH, maxHeight: panelMaxH, top: panelTop, left: panelLeft,
            border:     '1px solid var(--wt-settings-border)',
            boxShadow:  'var(--wt-shadow-lg)',
            backdropFilter: 'var(--wt-backdrop)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 wt-settings-divider"
            style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>
              Settings
            </span>
            <button className="wt-action-btn" style={{ width: '1.25rem', height: '1.25rem', borderRadius: '9999px' }} onClick={closeSettings}>
              <Icon icon={X} size={11} />
            </button>
          </div>
          <div className="flex-1 settings-scroll overflow-y-auto px-4 py-4 space-y-4">
            {hasPrefs && <PreferenceFields widgetId={id} preferences={preferences!} />}
            {hasPrefs && settingsContent && (
              <div style={{ borderTop: '1px solid var(--wt-settings-divider)' }} className="pt-4">
                {settingsContent}
              </div>
            )}
            {!hasPrefs && settingsContent}
          </div>
        </div>
      )}
    </div>
  )
}
