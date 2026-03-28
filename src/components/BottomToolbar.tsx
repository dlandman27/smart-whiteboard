import { useState, useRef, useEffect } from 'react'
import { Icon, IconButton } from '../ui/web'
import { DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { DrawingCanvas } from './DrawingCanvas'
import { DatabasePicker } from './DatabasePicker'
import { BoardMenu } from './BoardMenu'
import { NotificationCenter } from './NotificationCenter'
import { LayoutPicker } from './layout/LayoutPicker'
import { SettingsPanel } from './SettingsPanel'
import { Pill } from './Pill'
import type { PendingWidget } from '../types'

type Tool = 'pointer' | 'marker' | 'eraser'
type ActivePanel = 'theme' | 'layout' | 'board' | 'picker' | null

interface Props {
  onToolChange:     (tool: Tool) => void
  onWidgetSelected: (widget: PendingWidget) => void
  onSlide:          (dir: 'left' | 'right') => void
}

export function BottomToolbar({ onToolChange, onWidgetSelected, onSlide }: Props) {
  const { activeBoardId, boards } = useWhiteboardStore()

  const [activeTool,  setActiveTool]  = useState<Tool>('pointer')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE)
  const [eraserSize,  setEraserSize]  = useState(DEFAULT_ERASER_SIZE)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [hidden,      setHidden]      = useState(false)
  const touchStartY                   = useRef(0)

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel((p) => p === panel ? null : panel)
  }

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onToolbarTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 20) { setHidden(true); setActivePanel(null) }
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
          icon="Palette"
          size="xl"
          variant={activePanel === 'theme' ? 'active' : 'default'}
          onClick={() => togglePanel('theme')}
          title="Theme"
        />

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* Layout picker */}
        <IconButton
          icon="SquaresFour"
          size="xl"
          variant={activePanel === 'layout' ? 'active' : 'default'}
          onClick={() => togglePanel('layout')}
          title="Layout"

        />

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* Board picker */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => togglePanel('board')}
          className="wt-nav-btn px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
          style={{
            color:      activePanel === 'board' ? 'var(--wt-accent)' : 'var(--wt-text)',
            background: activePanel === 'board' ? 'color-mix(in srgb, var(--wt-accent) 10%, transparent)' : 'transparent',
          }}
          title="Boards & Layout"
        >
          {activeBoard?.name ?? 'Board'}
        </button>

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* Add widget */}
        <IconButton
          icon="Plus"
          size="xl"
          variant={activePanel === 'picker' ? 'active' : 'default'}
          onClick={() => { selectTool('pointer'); togglePanel('picker') }}
          title="Add Widget"
        />

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        <NotificationCenter />

      </Pill>

      {activePanel === 'theme'  && <SettingsPanel onClose={() => setActivePanel(null)} />}
      {activePanel === 'layout' && <LayoutPicker  onClose={() => setActivePanel(null)} />}
      {activePanel === 'board'  && <BoardMenu     onClose={() => setActivePanel(null)} onSlide={onSlide} />}
      {activePanel === 'picker' && (
        <DatabasePicker
          onClose={() => setActivePanel(null)}
          onWidgetSelected={(w) => { onWidgetSelected(w) }}
        />
      )}
    </>
  )
}
