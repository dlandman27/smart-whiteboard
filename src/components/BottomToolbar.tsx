import { useState, useRef, useEffect } from 'react'
import { MousePointer2, Pen, Eraser, LayoutGrid, Settings, LayoutDashboard, ChevronLeft, ChevronRight, Plus, Check, X as XIcon } from 'lucide-react'
import { Icon, IconButton, Text } from '../ui/web'
import { DRAWING_COLORS, STROKE_WIDTHS, DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { DrawingCanvas } from './DrawingCanvas'
import { DatabasePicker } from './DatabasePicker'
import { LayoutPicker } from './layout/LayoutPicker'
import { Pill } from './Pill'
import type { PendingWidget } from '../types'

type Tool = 'pointer' | 'marker' | 'eraser'

interface Props {
  onToolChange:      (tool: Tool) => void
  onOpenSettings:    () => void
  onCloseSettings:   () => void
  onWidgetSelected:  (widget: PendingWidget) => void
  onSlide:           (dir: 'left' | 'right') => void
}

export function BottomToolbar({ onToolChange, onOpenSettings, onCloseSettings, onWidgetSelected, onSlide }: Props) {
  const { activeBoardId, boards, setActiveBoard, addBoard, renameBoard, removeBoard } = useWhiteboardStore()

  const [activeTool,    setActiveTool]    = useState<Tool>('pointer')
  const [activeColor,   setActiveColor]   = useState(DEFAULT_COLOR)
  const [strokeWidth,   setStrokeWidth]   = useState(DEFAULT_STROKE)
  const [eraserSize,    setEraserSize]    = useState(DEFAULT_ERASER_SIZE)
  const [showPicker,    setShowPicker]    = useState(false)
  const [showLayouts,   setShowLayouts]   = useState(false)
  const [hidden,        setHidden]        = useState(false)
  const [isNaming,      setIsNaming]      = useState(false)
  const [newBoardName,  setNewBoardName]  = useState('')
  const [isRenaming,    setIsRenaming]    = useState(false)
  const [renameValue,   setRenameValue]   = useState('')
  const touchStartY                       = useRef(0)

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const activeBoard = boards[activeIndex]
  const prevBoard   = boards[activeIndex - 1]
  const nextBoard   = boards[activeIndex + 1]

  function goTo(id: string, dir: 'left' | 'right') {
    onSlide(dir)
    setActiveBoard(id)
  }

  function handleAddBoard() {
    if (!newBoardName.trim()) return
    onSlide('right')
    addBoard(newBoardName.trim())
    setNewBoardName('')
    setIsNaming(false)
  }

  function commitRename() {
    if (renameValue.trim()) renameBoard(activeBoardId, renameValue.trim())
    setIsRenaming(false)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    console.log('[toolbar] touchstart y=', touchStartY.current)
  }

  function onToolbarTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    console.log('[toolbar] touchend delta=', delta, '→', delta > 20 ? 'HIDE' : 'ignore')
    if (delta > 20) { setHidden(true); setShowPicker(false); onCloseSettings() }
  }

  // When hidden, any upward swipe anywhere on screen shows the toolbar
  useEffect(() => {
    if (!hidden) return
    let startY = 0
    function onStart(e: TouchEvent) { startY = e.touches[0].clientY }
    function onEnd(e: TouchEvent) {
      const delta = e.changedTouches[0].clientY - startY
      console.log('[window] touchend delta=', delta, '→', delta < -20 ? 'SHOW' : 'ignore')
      if (delta < -20) setHidden(false)
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

      {/* ── Drawing submenus (commented out — always pointer for now) ──
      {activeTool === 'eraser' && (
        <Pill className="slide-up absolute bottom-20 left-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 pointer-events-auto select-none" style={{ transform: 'translateX(-50%)' }}>
          <Icon icon={Eraser} size={13} className="text-stone-400 flex-shrink-0" />
          <input type="range" min={8} max={120} value={eraserSize} onChange={(e) => setEraserSize(Number(e.target.value))} className="w-36 accent-stone-700" />
          <Text as="span" variant="caption" color="muted" className="w-8 text-right flex-shrink-0">{eraserSize}px</Text>
        </Pill>
      )}
      {activeTool === 'marker' && (
        <Pill className="slide-up absolute bottom-20 left-1/2 z-[9999] flex items-center gap-px px-3 py-2 pointer-events-auto select-none" style={{ transform: 'translateX(-50%)' }}>
          <div className="flex items-center gap-1.5">
            {DRAWING_COLORS.map((c) => (
              <button key={c} onClick={() => setActiveColor(c)} title={c} className="rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{ width: 16, height: 16, background: c, boxShadow: activeColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none' }} />
            ))}
          </div>
          <div className="w-px h-5 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />
          <div className="flex items-center gap-2">
            {STROKE_WIDTHS.map(({ value, dot }) => (
              <button key={value} onClick={() => setStrokeWidth(value)} title={`${value}px`}
                className={`rounded-full bg-stone-800 transition-opacity flex-shrink-0 ${dot} ${strokeWidth === value ? 'opacity-100' : 'opacity-20 hover:opacity-50'}`} />
            ))}
          </div>
        </Pill>
      )}
      ── */}

      {/* ── Main toolbar ───────────────────────────────────────────── */}
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
        <IconButton
          icon={Settings}
          size="xl"
          variant="default"
          onClick={onOpenSettings}
          title="Settings"
        />
        <IconButton
          icon={LayoutDashboard}
          size="xl"
          variant={showLayouts ? 'active' : 'default'}
          onClick={() => { selectTool('pointer'); setShowLayouts((v) => !v) }}
          title="Layout"
        />
        <IconButton
          icon={LayoutGrid}
          size="xl"
          variant="default"
          onClick={() => { selectTool('pointer'); setShowPicker(true) }}
          title="Add Widget"
        />

        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

        {/* ── Board nav ──────────────────────────────────────────── */}
        <IconButton
          icon={ChevronLeft}
          size="xl"
          onClick={() => prevBoard && goTo(prevBoard.id, 'left')}
          disabled={!prevBoard}
          title={prevBoard?.name}
        />

        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            className="wt-input w-24 text-xs text-center rounded-md px-2 py-1"
          />
        ) : isNaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              placeholder="Board name…"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddBoard()
                if (e.key === 'Escape') { setIsNaming(false); setNewBoardName('') }
              }}
              className="wt-input w-24 text-xs text-center rounded-md px-2 py-1"
            />
            <IconButton icon={Check} size="sm" onClick={handleAddBoard} className="text-green-500 hover:text-green-600" />
            <IconButton icon={XIcon} size="sm" onClick={() => { setIsNaming(false); setNewBoardName('') }} />
          </div>
        ) : (
          <button
            onDoubleClick={() => { setRenameValue(activeBoard?.name ?? ''); setIsRenaming(true) }}
            className="wt-nav-btn px-2 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[4.5rem] text-center"
            title="Double-click to rename"
          >
            {activeBoard?.name ?? 'Board'}
          </button>
        )}

        <IconButton
          icon={ChevronRight}
          size="xl"
          onClick={() => nextBoard && goTo(nextBoard.id, 'right')}
          disabled={!nextBoard}
          title={nextBoard?.name}
        />

        <IconButton
          icon={Plus}
          size="xl"
          onClick={() => !isNaming && setIsNaming(true)}
          title="New board"
        />

        {boards.length > 1 && (
          <IconButton
            icon={XIcon}
            size="xl"
            variant="default"
            onClick={() => removeBoard(activeBoardId)}
            title="Delete board"
            className="text-red-400 hover:text-red-500"
          />
        )}

        {/* ── Drawing tools (commented out — always pointer for now) ──
        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />
        <IconButton
          icon={MousePointer2}
          size="xl"
          variant={activeTool === 'pointer' ? 'active' : 'default'}
          onClick={() => selectTool('pointer')}
          title="Select / Move"
        />
        <IconButton
          icon={Pen}
          size="xl"
          variant={activeTool === 'marker' ? 'active' : 'default'}
          onClick={() => selectTool('marker')}
          title="Marker"
        />
        <IconButton
          icon={Eraser}
          size="xl"
          variant={activeTool === 'eraser' ? 'active' : 'default'}
          onClick={() => selectTool('eraser')}
          title="Eraser"
        />
        <div className="w-px h-7 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />
        ── */}
      </Pill>

      {showLayouts && <LayoutPicker onClose={() => setShowLayouts(false)} />}
      {showPicker && (
        <DatabasePicker
          onClose={() => setShowPicker(false)}
          onWidgetSelected={(w) => { onWidgetSelected(w) }}
        />
      )}
    </>
  )
}
