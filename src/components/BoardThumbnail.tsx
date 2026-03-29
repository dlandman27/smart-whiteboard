import { useThemeStore } from '../store/theme'
import type { Board } from '../store/whiteboard'

interface Props {
  board:  Board
  width?: number
  height?: number
}

export function BoardThumbnail({ board, width = 72, height = 48 }: Props) {
  const { background } = useThemeStore()
  const canvasW = window.innerWidth  || 1920
  const canvasH = window.innerHeight || 1080
  const pad = 2

  // Scale widget rects to thumbnail size
  const rects = board.widgets.map((w) => ({
    id: w.id,
    x:  pad + (w.x / canvasW) * (width  - pad * 2),
    y:  pad + (w.y / canvasH) * (height - pad * 2),
    w:  Math.max(3, (w.width  / canvasW) * (width  - pad * 2)),
    h:  Math.max(3, (w.height / canvasH) * (height - pad * 2)),
  }))

  // Clamp to thumbnail bounds
  const clamp = (rects: ReturnType<typeof rects.map>) => rects.map((r) => ({
    ...r,
    x: Math.max(pad, r.x),
    y: Math.max(pad, r.y),
    w: Math.min(r.w, width  - pad - r.x),
    h: Math.min(r.h, height - pad - r.y),
  }))

  const bg = background.bg

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}
    >
      {/* Background */}
      <rect width={width} height={height} fill={bg} rx={6} />

      {/* Subtle dot grid */}
      <defs>
        <pattern id={`dot-${board.id}`} width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={0.5} fill={background.dot} opacity={0.6} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#dot-${board.id})`} rx={6} />

      {/* Widget rectangles */}
      {clamp(rects).map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={Math.max(0, r.w)}
          height={Math.max(0, r.h)}
          rx={2}
          fill="var(--wt-accent)"
          opacity={0.22}
          stroke="var(--wt-accent)"
          strokeWidth={0.75}
          strokeOpacity={0.5}
        />
      ))}

      {/* Empty state hint */}
      {board.widgets.length === 0 && (
        <text
          x={width / 2} y={height / 2 + 3}
          textAnchor="middle"
          fontSize={7}
          fill="var(--wt-text-muted)"
          opacity={0.5}
        >
          empty
        </text>
      )}
    </svg>
  )
}
