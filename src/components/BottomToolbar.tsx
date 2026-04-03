import { useState, useRef, useEffect } from 'react'
import { soundPanelOpen, soundSwipe, soundClick } from '../lib/sounds'
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
  const pillRef                       = useRef<HTMLDivElement>(null)

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel((p) => (p !== panel ? panel : null))
  }

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function onToolbarTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 20) { setHidden(true); setActivePanel(null) }
  }

  // Play click sound on press AND release for every button inside the pill
  useEffect(() => {
    const pill = pillRef.current
    if (!pill) return
    function onDown(e: PointerEvent) {
      const btn = (e.target as HTMLElement).closest('button')
      if (btn && !btn.hasAttribute('data-no-click-sound')) soundClick()
    }
    function onUp(e: PointerEvent) {
      const btn = (e.target as HTMLElement).closest('button')
      if (btn && !btn.hasAttribute('data-no-click-sound')) soundClick()
    }
    pill.addEventListener('pointerdown', onDown)
    pill.addEventListener('pointerup',   onUp)
    return () => {
      pill.removeEventListener('pointerdown', onDown)
      pill.removeEventListener('pointerup',   onUp)
    }
  }, [])

  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (hidden) soundSwipe()
    else soundPanelOpen()
  }, [hidden])

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

  useEffect(() => {
    if (hidden || activePanel) return
    function onPointerDown(e: PointerEvent) {
      if (!pillRef.current?.contains(e.target as Node)) {
        setHidden(true)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [hidden, activePanel])

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
        ref={pillRef}
        className="absolute bottom-2 left-1/2 z-[9999] flex items-center gap-2 p-2.5 select-none"
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

        {/* Layout picker */}
        <IconButton
          icon="SquaresFour"
          size="xl"
          variant={activePanel === 'layout' ? 'active' : 'default'}
          onClick={() => togglePanel('layout')}
          title="Layout"
        />

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

        {/* Add widget */}
        <IconButton
          icon="Plus"
          size="xl"
          variant={activePanel === 'picker' ? 'active' : 'default'}
          onClick={() => { selectTool('pointer'); togglePanel('picker') }}
          title="Add Widget"
        />


        <NotificationCenter />

        {/* Hide tab — sits on top of the pill */}
        <button
          data-no-click-sound
          onClick={() => { setHidden(true); setActivePanel(null) }}
          style={{
            position:        'absolute',
            top:             0,
            left:            '50%',
            transform:       'translate(-50%, -100%)',
            background:      'var(--wt-bg)',
            border:          '1px solid var(--wt-border)',
            borderBottom:    'none',
            borderRadius:    '6px 6px 0 0',
            padding:         '2px 28px',
            cursor:          'pointer',
            color:           'var(--wt-text-muted)',
            display:         'flex',
            alignItems:      'center',
          }}
        >
          <Icon icon="CaretDown" size={11} />
        </button>

      </Pill>

      {/* ── Show-again tab ───────────────────────────────────────── */}
      <button
        onClick={() => setHidden(false)}
        className="absolute bottom-0 left-1/2 z-[9999] flex items-center gap-1 px-4 py-1 wt-pill rounded-t-xl rounded-b-none select-none"
        style={{
          transform:     hidden ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
          transition:    'transform 0.25s ease',
          borderBottom:  'none',
          fontSize:      12,
          fontWeight:    600,
          color:         'var(--wt-text-muted)',
        }}
      >
        <Icon icon="CaretUp" size={12} />
        Menu
      </button>

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
