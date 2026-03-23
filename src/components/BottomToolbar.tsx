import { useState, useRef, useEffect } from 'react'
import { MousePointer2, Pen, Eraser, Plus, Palette } from 'lucide-react'
import { Icon, IconButton } from '../ui/web'
import { DRAWING_COLORS, STROKE_WIDTHS, DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { DrawingCanvas } from './DrawingCanvas'
import { DatabasePicker } from './DatabasePicker'
import { BoardMenu } from './BoardMenu'
import { Pill } from './Pill'
import type { PendingWidget } from '../types'

type Tool = 'pointer' | 'marker' | 'eraser'

interface Props {
  onToolChange:      (tool: Tool) => void
  settingsOpen:      boolean
  onOpenSettings:    () => void
  onCloseSettings:   () => void
  onWidgetSelected:  (widget: PendingWidget) => void
  onSlide:           (dir: 'left' | 'right') => void
}

export function BottomToolbar({ onToolChange, settingsOpen, onOpenSettings, onCloseSettings, onWidgetSelected, onSlide }: Props) {
  const { activeBoardId, boards } = useWhiteboardStore()

  const [activeTool,  setActiveTool]  = useState<Tool>('pointer')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE)
  const [eraserSize,  setEraserSize]  = useState(DEFAULT_ERASER_SIZE)
  const [showPicker,  setShowPicker]  = useState(false)
  const [showBoard,   setShowBoard]   = useState(false)
  const [hidden,      setHidden]      = useState(false)
  const touchStartY                   = useRef(0)

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onToolbarTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 20) { setHidden(true); setShowPicker(false); onCloseSettings() }
  }

  useEffect(() => {
    if (!hidden) return
    let startY = 0
    function onStart(e: TouchEvent) { startY = e.touches[0].clientY }
    function onEnd(e: TouchEvent) {
      if (e.changedTouches[0].clientY - startY < -20) setHidden(false)
    }
    window.addEventListener('touchstart', onStart)
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [hidden])

  function selectTool(tool: Tool) {
    setActiveTool(tool)
    onToolChange(tool)
  }

  return (
    <>
      <DrawingCanvas
        boardId={activeBoardId}
        tool={activeTool}
        color={activeColor}
        strokeWidth={strokeWidth}
        eraserSize={eraserSize}
      />

      {/* ── Main toolbar ─────────────────────────────────────────── */}
      <Pill
        className="absolute bottom-2 left-1/2 z-[9999] flex items-center gap-px p-2.5 select-none"
        style={{
          transform:     hidden ? 'translateX(-50%) translateY(calc(100% + 12px))' : 'translateX(-50%)',
          transition:    'transform 0.25s ease, opacity 0.25s ease',
          opacity:       hidden ? 0 : 1,
          pointerEvents: hidden ? 'none' : 'auto',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onToolbarTouchEnd}
      >
        {/* Theme */}
        <IconButton
          icon={Palette}
          size="xl"
          variant={settingsOpen ? 'active' : 'default'}
          onClick={settingsOpen ? onCloseSettings : onOpenSettings}
          title="Theme"
        />

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* Board picker */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowBoard((v) => !v)}
          className="wt-nav-btn px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
          style={{
            color:      showBoard ? 'var(--wt-accent)' : 'var(--wt-text)',
            background: showBoard ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'transparent',
          }}
          title="Boards & Layout"
        >
          {activeBoard?.name ?? 'Board'}
        </button>

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* Add widget */}
        <IconButton
          icon={Plus}
          size="xl"
          variant={showPicker ? 'active' : 'default'}
          onClick={() => { selectTool('pointer'); setShowPicker((v) => !v) }}
          title="Add Widget"
        />
      </Pill>

      {showBoard  && <BoardMenu onClose={() => setShowBoard(false)} onSlide={onSlide} />}
      {showPicker && (
        <DatabasePicker
          onClose={() => setShowPicker(false)}
          onWidgetSelected={(w) => { onWidgetSelected(w) }}
        />
      )}
    </>
  )
}
