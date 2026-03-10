import { useState } from 'react'
import { Plus, MousePointer2, Pen, Eraser } from 'lucide-react'
import { Icon, IconButton, Text } from '../ui/web'
import { DRAWING_COLORS, STROKE_WIDTHS, DEFAULT_COLOR, DEFAULT_STROKE, DEFAULT_ERASER_SIZE } from '../constants/drawing'
import { useWhiteboardStore } from '../store/whiteboard'
import { DrawingCanvas } from './DrawingCanvas'
import { DatabasePicker } from './DatabasePicker'
import { Pill } from './Pill'

type Tool = 'pointer' | 'marker' | 'eraser'

interface Props {
  onToolChange: (tool: Tool) => void
}

export function BottomToolbar({ onToolChange }: Props) {
  const { activeBoardId } = useWhiteboardStore()

  const [activeTool, setActiveTool]   = useState<Tool>('pointer')
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE)
  const [eraserSize, setEraserSize]   = useState(DEFAULT_ERASER_SIZE)
  const [showPicker, setShowPicker]   = useState(false)

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
          className="slide-up absolute bottom-20 left-1/2 z-20 flex items-center gap-3 px-4 py-2.5 pointer-events-auto select-none"
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
          className="slide-up absolute bottom-20 left-1/2 z-20 flex items-center gap-px px-3 py-2 pointer-events-auto select-none"
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

          <div className="w-px h-5 bg-stone-200 mx-2" />

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
      <Pill className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-px px-2 py-2 pointer-events-auto select-none">
        <IconButton
          icon={MousePointer2}
          variant={activeTool === 'pointer' ? 'active' : 'default'}
          onClick={() => selectTool('pointer')}
          title="Select / Move"
        />
        <IconButton
          icon={Pen}
          variant={activeTool === 'marker' ? 'active' : 'default'}
          onClick={() => selectTool('marker')}
          title="Marker"
        />
        <IconButton
          icon={Eraser}
          variant={activeTool === 'eraser' ? 'active' : 'default'}
          onClick={() => selectTool('eraser')}
          title="Eraser"
        />

        <div className="w-px h-6 bg-stone-200 mx-1.5" />

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors"
        >
          <Icon icon={Plus} size={14} />
          Add Widget
        </button>
      </Pill>

      {showPicker && <DatabasePicker onClose={() => setShowPicker(false)} />}
    </>
  )
}
