import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Settings, X } from 'lucide-react'
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

const DRAG_THRESHOLD = 6
const PANEL_WIDTH     = 272
const CLOSE_MS        = 130

// Monotonically increasing counter — each activation gets a unique z-order
let zCounter = 10


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
  slotAssigned?:    boolean
  onDropped?:       (rect: { x: number; y: number; width: number; height: number }, cursorPt: { x: number; y: number }) => void
  onDragStart?:     () => void
  onDragMove?:      (cx: number, cy: number) => void
  onDragEnd?:       () => void
}

export function Widget({ id, x, y, width, height, children, settingsContent, preferences, refSize, slotAssigned, onDropped, onDragStart, onDragMove, onDragEnd }: Props) {
  const { updateLayout, removeWidget } = useWhiteboardStore()

  const [active,       setActive]       = useState(false)
  const [zOrder,       setZOrder]       = useState(0)
  const [dragging,     setDragging]     = useState(false)
  const [dragOrigin,   setDragOrigin]   = useState('50% 50%')
  const [showSettings, setShowSettings] = useState(false)
  const [isClosing,    setIsClosing]    = useState(false)
  const [pos,  setPos]  = useState({ x, y })
  const [size, setSize] = useState({ width, height })
  const [fullscreen,    setFullscreen]   = useState(false)
  const [fsExpanded,    setFsExpanded]   = useState(false)
  const [fsRect,        setFsRect]       = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fsExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef     = useRef<HTMLDivElement>(null)
  const closeTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs mirror state so event handler closures stay fresh
  const posRef  = useRef({ x, y })
  const sizeRef = useRef({ width, height })

  // Body drag — pending until threshold crossed, then becomes a real drag
  const bodyDrag = useRef<{
    pointerId: number
    startCX:   number; startCY: number
    startX:    number; startY:  number
    dragging:  boolean
  } | null>(null)

  // Sync refs when props change (external store update)
  useEffect(() => { setPos({ x, y });         posRef.current  = { x, y }         }, [x, y])
  useEffect(() => { setSize({ width, height }); sizeRef.current = { width, height } }, [width, height])

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
    if (closeTimer.current)   clearTimeout(closeTimer.current)
    if (fsExitTimer.current)  clearTimeout(fsExitTimer.current)
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

  // ── Fullscreen ────────────────────────────────────────────────────
  function enterFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (fsExitTimer.current) clearTimeout(fsExitTimer.current)
    const rect = el.getBoundingClientRect()
    setFsRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    setFullscreen(true)
    setFsExpanded(false)
    raise()
    // Two rAFs: first lets React commit fixed-at-origin rect, second triggers the expand transition
    requestAnimationFrame(() => requestAnimationFrame(() => setFsExpanded(true)))
  }
  function exitFullscreen() {
    setFsExpanded(false)
    fsExitTimer.current = setTimeout(() => {
      setFullscreen(false)
      setFsRect(null)
    }, 300)
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function calcDragPos(
    startX: number, startY: number,
    startCX: number, startCY: number,
    clientX: number, clientY: number,
  ) {
    return {
      x: startX + (clientX - startCX),
      y: startY + (clientY - startCY),
    }
  }

  // ── Body drag (threshold-based: move past DRAG_THRESHOLD to drag, lift to tap) ──
  function onBodyDown(e: React.PointerEvent) {
    if (fullscreen) return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    bodyDrag.current = {
      pointerId: e.pointerId,
      startCX:  e.clientX, startCY: e.clientY,
      startX:   posRef.current.x, startY: posRef.current.y,
      dragging: false,
    }
    raise()
  }

  function onBodyMove(e: React.PointerEvent) {
    const bd = bodyDrag.current
    if (!bd || e.pointerId !== bd.pointerId) return
    const dx = e.clientX - bd.startCX
    const dy = e.clientY - bd.startCY
    if (!bd.dragging) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
      bd.dragging = true
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const ox = ((bd.startCX - rect.left) / rect.width  * 100).toFixed(1) + '%'
        const oy = ((bd.startCY - rect.top)  / rect.height * 100).toFixed(1) + '%'
        setDragOrigin(`${ox} ${oy}`)
      }
      onDragStart?.()
      setActive(true)
      setDragging(true)
    }
    const np = calcDragPos(bd.startX, bd.startY, bd.startCX, bd.startCY, e.clientX, e.clientY)
    posRef.current = np
    setPos(np)
    // Use cursor position (relative to canvas) for slot detection — more intuitive than widget center
    const pRect = containerRef.current?.parentElement?.getBoundingClientRect()
    const cx = pRect ? e.clientX - pRect.left : np.x + sizeRef.current.width / 2
    const cy = pRect ? e.clientY - pRect.top  : np.y + sizeRef.current.height / 2
    onDragMove?.(cx, cy)
  }

  function onBodyUp(e: React.PointerEvent) {
    const bd = bodyDrag.current
    if (!bd || e.pointerId !== bd.pointerId) return
    if (bd.dragging) {
      const finalRect = { ...calcDragPos(bd.startX, bd.startY, bd.startCX, bd.startCY, e.clientX, e.clientY), ...sizeRef.current }
      const pRect = containerRef.current?.parentElement?.getBoundingClientRect()
      const cursorPt = pRect
        ? { x: e.clientX - pRect.left, y: e.clientY - pRect.top }
        : { x: finalRect.x + finalRect.width / 2, y: finalRect.y + finalRect.height / 2 }
      updateLayout(id, finalRect)
      onDropped?.(finalRect, cursorPt)
      onDragEnd?.()
      setDragging(false)
      // Reset local pos to prop values so snap-back (restored by parent) takes effect
      setPos({ x, y })
      posRef.current = { x, y }
    } else {
      // Tap — activate widget
      setActive(true)
    }
    bodyDrag.current = null
  }

  // ── Render ────────────────────────────────────────────────────────
  const hasPrefs    = !!(preferences && preferences.length > 0)
  const hasSettings = !!(settingsContent || hasPrefs)
  const isActive    = active || showSettings || fullscreen
  const openRight   = pos.x + size.width + PANEL_WIDTH + 12 < window.innerWidth
  const panelMaxH   = Math.min(Math.max(size.height, 320), window.innerHeight - 40)
  const panelTop    = Math.min(0, window.innerHeight - 12 - pos.y - panelMaxH)
  const panelLeft   = openRight ? size.width + 8 : -(PANEL_WIDTH + 8)
  const animClass   = isClosing
    ? (openRight ? 'settings-close-right' : 'settings-close-left')
    : (openRight ? 'settings-open-right'  : 'settings-open-left')
  const renderW = fullscreen && fsExpanded ? window.innerWidth  : size.width
  const renderH = fullscreen && fsExpanded ? window.innerHeight : size.height
  const scale = refSize ? Math.min(renderW / refSize.width, renderH / refSize.height) : 1
  // When dragging, shrink every widget to the same target footprint
  const DRAG_TARGET_W = 260
  const DRAG_TARGET_H = 160
  const dragScale = Math.min(DRAG_TARGET_W / size.width, DRAG_TARGET_H / size.height)

  const FS_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
  const fsStyle: React.CSSProperties = fullscreen && fsRect
    ? {
        position:   'fixed',
        left:       fsExpanded ? 0             : fsRect.left,
        top:        fsExpanded ? 0             : fsRect.top,
        width:      fsExpanded ? '100vw'       : fsRect.width,
        height:     fsExpanded ? '100vh'       : fsRect.height,
        zIndex:     9999,
        touchAction: 'none',
        transition: `left 0.3s ${FS_EASE}, top 0.3s ${FS_EASE}, width 0.3s ${FS_EASE}, height 0.3s ${FS_EASE}`,
        borderRadius: fsExpanded ? 0 : undefined,
      }
    : {
        position:   'absolute',
        left:       pos.x,
        top:        pos.y,
        width:      size.width,
        height:     size.height,
        zIndex:     showSettings ? 10002 : zOrder + (dragging ? 3 : isActive ? 1 : 0),
        touchAction: 'none',
        transform:   dragging ? `scale(${dragScale})` : undefined,
        transformOrigin: dragging ? dragOrigin : 'center',
        transition:  dragging ? 'transform 0.15s ease' : 'transform 0.2s ease',
        opacity:     dragging ? 0.85 : 1,
      }

  return (
    <div
      ref={containerRef}
      style={fsStyle}
      onPointerDown={onBodyDown}
      onPointerMove={onBodyMove}
      onPointerUp={onBodyUp}
      onPointerCancel={(e) => {
        const bd = bodyDrag.current
        if (bd && e.pointerId === bd.pointerId) {
          if (bd.dragging) { setPos({ x: bd.startX, y: bd.startY }); posRef.current = { x: bd.startX, y: bd.startY }; setDragging(false) }
          bodyDrag.current = null
        }
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => {
        if (!showSettings && !dragging) setActive(false)
      }}
    >
      {/* Widget frame — content fills the entire frame, no overlapping header */}
      <div
        className="w-full h-full overflow-hidden border transition-all duration-150"
        style={{
          borderRadius:    fullscreen && fsExpanded ? 0 : '1rem',
          transition:      `border-radius 0.3s ${FS_EASE}, border-color 0.15s, box-shadow 0.15s`,
          backgroundColor: 'var(--wt-bg)',
          backdropFilter:  'var(--wt-backdrop)',
          borderColor:     (dragging || isActive) ? 'var(--wt-border-active)' : 'var(--wt-border)',
          boxShadow:       dragging ? 'var(--wt-shadow-lg)' : isActive ? 'var(--wt-shadow-md)' : 'var(--wt-shadow-sm)',
        }}
      >
        <div className={`w-full h-full overflow-hidden${refSize ? ' flex items-center justify-center' : ''}`}>
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

      {/* Corner action buttons — top-right overlay */}
      <div
        className="absolute flex flex-row gap-1 p-1 rounded-xl transition-opacity duration-100"
        style={{
          top: 8, right: 8, zIndex: 20,
          backgroundColor: 'var(--wt-action-bg)',
          border:          '1px solid var(--wt-action-border)',
          boxShadow:       'var(--wt-shadow-md)',
          opacity:         isActive ? 1 : 0,
          pointerEvents:   isActive ? 'auto' : 'none',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {hasSettings && (
          <button className="wt-action-btn" onClick={toggleSettings}>
            <Icon icon={Settings} size={13} />
          </button>
        )}
        <button className="wt-action-btn" onClick={fullscreen ? exitFullscreen : enterFullscreen}>
          <Icon icon={fullscreen ? Minimize2 : Maximize2} size={13} />
        </button>
        <button
          className="wt-action-btn wt-action-btn-danger"
          style={confirmDelete ? { background: '#ef4444', color: '#fff', paddingLeft: 6, paddingRight: 6, borderRadius: 6 } : undefined}
          onClick={() => {
            if (confirmDelete) {
              if (deleteTimer.current) clearTimeout(deleteTimer.current)
              removeWidget(id)
            } else {
              setConfirmDelete(true)
              deleteTimer.current = setTimeout(() => setConfirmDelete(false), 3000)
            }
          }}
        >
          {confirmDelete ? <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>Remove?</span> : <Icon icon={X} size={13} />}
        </button>
      </div>

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
