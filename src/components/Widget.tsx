import { useEffect, useState } from 'react'
import { Rnd } from 'react-rnd'
import { X } from 'lucide-react'
import { useWhiteboardStore } from '../store/whiteboard'

const GRID_SIZE = 28 // matches the dot pattern spacing

interface Props {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  children: React.ReactNode
}

export function Widget({ id, title, x, y, width, height, children }: Props) {
  const { updateLayout, removeWidget } = useWhiteboardStore()
  const [ctrlHeld, setCtrlHeld] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      setCtrlHeld(e.ctrlKey)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  const snapGrid: [number, number] = ctrlHeld ? [GRID_SIZE, GRID_SIZE] : [1, 1]

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      onDragStop={(_, d) => updateLayout(id, { x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, pos) =>
        updateLayout(id, {
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
      dragHandleClassName="widget-drag-handle"
      minWidth={300}
      minHeight={200}
      bounds="parent"
      grid={snapGrid}
      className="react-rnd-container"
      style={{ zIndex: 10 }}
    >
      <div
        style={{ width: '100%', height: '100%' }}
        className="flex flex-col bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden"
      >
        {/* Title bar / drag handle */}
        <div className={`widget-drag-handle flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing select-none flex-shrink-0 border-b transition-colors ${ctrlHeld ? 'bg-blue-50 border-blue-200' : 'bg-stone-50 border-stone-200'}`}>
          <span className="flex-1 text-sm font-semibold text-stone-700 truncate">{title}</span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => removeWidget(id)}
            className="p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
            title="Remove widget"
          >
            <X size={14} />
          </button>
        </div>

        {/* Widget content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {children}
        </div>
      </div>
    </Rnd>
  )
}
