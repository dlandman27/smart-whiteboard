import { useState, useRef, useEffect } from 'react'
import { MousePointer2, Pen, Eraser, LayoutGrid, Settings } from 'lucide-react'
import { Icon, IconButton, Text } from '../ui/web'
import { DRAWING_COLORS, STROKE_WIDTHS, DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { DrawingCanvas } from './DrawingCanvas'
import { DatabasePicker } from './DatabasePicker'
import { Pill } from './Pill'

type Tool = 'pointer' | 'marker' | 'eraser'

interface Props {
  onToolChange:    (tool: Tool) => void
  onOpenSettings:  () => void
  onCloseSettings: () => void
}

export function BottomToolbar({ onToolChange, onOpenSettings, onCloseSettings }: Props) {
  const { activeBoardId } = useWhiteboardStore()

  const [activeTool, setActiveTool]   = useState<Tool>('pointer')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE)
  const [eraserSize, setEraserSize]   = useState(DEFAULT_ERASER_SIZE)
  const [showPicker, setShowPicker]   = useState(false)
  const [hidden, setHidden]           = useState(false)
  const touchStartY                   = useRef(0)

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

      {/* ── Eraser submenu ─────────────────────────────────────────── */}
      {activeTool === 'eraser' && (
        <Pill
          className="slide-up absolute bottom-20 left-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 pointer-events-auto select-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <Icon icon={Eraser} size={13} className="text-stone-400 flex-shrink-0" />
          <input
            type="range"
            min={8}
            max={120}
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            className="w-36 accent-stone-700"
          />
          <Text as="span" variant="caption" color="muted" className="w-8 text-right flex-shrink-0">{eraserSize}px</Text>
        </Pill>
      )}

      {/* ── Marker submenu ─────────────────────────────────────────── */}
      {activeTool === 'marker' && (
        <Pill
          className="slide-up absolute bottom-20 left-1/2 z-[9999] flex items-center gap-px px-3 py-2 pointer-events-auto select-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-1.5">
            {DRAWING_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                title={c}
                className="rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: c,
                  boxShadow: activeColor === c
                    ? `0 0 0 2px white, 0 0 0 3.5px ${c}`
                    : 'none',
                }}
              />
            ))}
          </div>

          <div className="w-px h-5 mx-2" style={{ backgroundColor: 'var(--wt-border)' }} />

          <div className="flex items-center gap-2">
            {STROKE_WIDTHS.map(({ value, dot }) => (
              <button
                key={value}
                onClick={() => setStrokeWidth(value)}
                title={`${value}px`}
                className={`rounded-full bg-stone-800 transition-opacity flex-shrink-0 ${dot} ${strokeWidth === value ? 'opacity-100' : 'opacity-20 hover:opacity-50'}`}
              />
            ))}
          </div>
        </Pill>
      )}

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

        <IconButton
          icon={Settings}
          size="xl"
          variant="default"
          onClick={onOpenSettings}
          title="Settings"
        />
        <IconButton
          icon={LayoutGrid}
          size="xl"
          variant="default"
          onClick={() => { selectTool('pointer'); setShowPicker(true) }}
          title="Add Widget"
        />
      </Pill>


      {showPicker && <DatabasePicker onClose={() => setShowPicker(false)} onOpenSettings={() => { setShowPicker(false); onOpenSettings() }} />}
    </>
  )
}
