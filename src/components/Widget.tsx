import { useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { GripHorizontal, Settings, X } from 'lucide-react'
import { useWhiteboardStore } from '../store/whiteboard'

const GRID_SIZE     = 28
const LONG_PRESS_MS = 500
const PANEL_WIDTH   = 272
const GAP           = 10
const CLOSE_MS      = 130

interface DragStripProps {
  active:      boolean
  hasSettings: boolean
  onRemove:    () => void
  onSettings:  () => void
}

function WidgetDragStrip({ active, hasSettings, onRemove, onSettings }: DragStripProps) {
  return (
    <div
      className={`widget-drag-handle relative z-10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none transition-all duration-150 overflow-hidden ${
        active ? 'h-7 bg-white/80 backdrop-blur-sm border-b border-stone-100' : 'h-3 bg-transparent'
      }`}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onSettings}
        className={`flex items-center justify-center w-5 h-5 rounded-full transition-all ${
          active && hasSettings
            ? 'opacity-100 hover:bg-stone-100 text-stone-400 hover:text-stone-600'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <Settings size={11} />
      </button>

      <GripHorizontal
        size={active ? 14 : 10}
        className="text-stone-300 pointer-events-none transition-all duration-150"
      />

      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className={`flex items-center justify-center w-5 h-5 rounded-full transition-all ${
          active
            ? 'opacity-100 hover:bg-red-50 text-stone-400 hover:text-red-400'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <X size={11} />
      </button>
    </div>
  )
}

interface Props {
  id:               string
  x:                number
  y:                number
  width:            number
  height:           number
  children:         React.ReactNode
  settingsContent?: React.ReactNode
  refSize?:         { width: number; height: number }
}

export function Widget({ id, x, y, width, height, children, settingsContent, refSize }: Props) {
  const { updateLayout, removeWidget } = useWhiteboardStore()
  const [ctrlHeld,     setCtrlHeld]     = useState(false)
  const [active,       setActive]       = useState(false)
  const [dragging,     setDragging]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isClosing,    setIsClosing]    = useState(false)
  // Live position tracked during drag so panel side swaps in real time
  const [pos, setPos]                   = useState({ x, y })
  const closeTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef                        = useRef<HTMLDivElement>(null)

  // Keep pos in sync when store updates (e.g. on drop)
  useEffect(() => { setPos({ x, y }) }, [x, y])

  // Close settings on click outside the panel
  useEffect(() => {
    if (!showSettings) return
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeSettings()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showSettings])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { setCtrlHeld(e.ctrlKey) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup',   onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup',   onKey)
    }
  }, [])

  function openSettings() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setIsClosing(false)
    setShowSettings(true)
  }

  function closeSettings() {
    setIsClosing(true)
    closeTimer.current = setTimeout(() => {
      setShowSettings(false)
      setIsClosing(false)
    }, CLOSE_MS)
  }

  function toggleSettings() {
    if (showSettings && !isClosing) closeSettings()
    else openSettings()
  }

  function startLongPress() {
    longPressTimer.current = setTimeout(() => setActive(true), LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const snapGrid: [number, number] = ctrlHeld ? [GRID_SIZE, GRID_SIZE] : [1, 1]
  const scale = refSize ? Math.min(width / refSize.width, height / refSize.height) : 1
  const isActive  = active || showSettings

  // Recompute side from live pos so it swaps while dragging
  const openRight = pos.x + width + GAP + PANEL_WIDTH + 12 < window.innerWidth

  // Vertical clamping: shift panel up if it would overflow the viewport bottom
  const panelMaxH = Math.min(Math.max(height, 320), window.innerHeight - 40)
  const panelTop  = Math.min(0, window.innerHeight - 12 - pos.y - panelMaxH)

  const bridgeLeft = openRight ? width       : -(GAP)
  const panelLeft  = openRight ? width + GAP : -(GAP + PANEL_WIDTH)

  const animClass = isClosing
    ? (openRight ? 'settings-close-right' : 'settings-close-left')
    : (openRight ? 'settings-open-right'  : 'settings-open-left')

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      onDragStart={() => setDragging(true)}
      onDrag={(_, d) => setPos({ x: d.x, y: d.y })}
      onDragStop={(_, d) => {
        setDragging(false)
        setPos({ x: d.x, y: d.y })
        updateLayout(id, { x: d.x, y: d.y })
      }}
      onResizeStop={(_, __, ref, ___, p) =>
        updateLayout(id, { x: p.x, y: p.y, width: ref.offsetWidth, height: ref.offsetHeight })
      }
      dragHandleClassName="widget-drag-handle"
      minWidth={200}
      minHeight={140}
      bounds="parent"
      grid={snapGrid}
      className="react-rnd-container"
      style={{ zIndex: dragging ? 30 : showSettings ? 25 : isActive ? 20 : 10 }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => { if (!showSettings) setActive(false) }}
      onPointerDown={(e: React.PointerEvent) => { if (e.pointerType !== 'mouse') startLongPress() }}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      {/* Widget frame */}
      <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-white border transition-all duration-150 ${
        dragging ? 'border-stone-300 shadow-2xl scale-[1.01]' : isActive ? 'border-stone-300 shadow-xl' : 'border-stone-200 shadow-md'
      }`}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            style={{
              width:           refSize ? refSize.width  : '100%',
              height:          refSize ? refSize.height : '100%',
              transform:       scale !== 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'center',
              flexShrink:      0,
            }}
          >
            {children}
          </div>
        </div>
        <WidgetDragStrip
          active={isActive}
          hasSettings={!!settingsContent}
          onRemove={() => removeWidget(id)}
          onSettings={toggleSettings}
        />
      </div>

      {/* Bridge stem */}
      {showSettings && settingsContent && (
        <div
          className="absolute bg-stone-300 rounded-full pointer-events-none"
          style={{ top: 13, left: bridgeLeft, width: GAP, height: 2 }}
        />
      )}

      {/* Settings panel */}
      {showSettings && settingsContent && (
        <div
          ref={panelRef}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${animClass}`}
          style={{ width: PANEL_WIDTH, maxHeight: panelMaxH, top: panelTop, left: panelLeft }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Settings</span>
            <button
              onClick={closeSettings}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
          <div className="flex-1 settings-scroll overflow-y-auto px-4 py-4">
            {settingsContent}
          </div>
        </div>
      )}
    </Rnd>
  )
}
