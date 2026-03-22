import type { Layout } from '../../types'

interface Props {
  layout: Layout
  width?: number
  height?: number
  active?: boolean
}

export function LayoutThumbnail({ layout, width = 88, height = 60, active = false }: Props) {
  const pad = 4
  const gap = 2

  const usableW = width  - pad * 2
  const usableH = height - pad * 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {layout.slots.map((slot) => {
        const leftGap  = slot.x > 0.001                   ? gap / 2 : 0
        const rightGap = slot.x + slot.width  < 0.999     ? gap / 2 : 0
        const topGap   = slot.y > 0.001                   ? gap / 2 : 0
        const botGap   = slot.y + slot.height < 0.999     ? gap / 2 : 0

        const rx = pad + slot.x      * usableW + leftGap
        const ry = pad + slot.y      * usableH + topGap
        const rw = slot.width  * usableW - leftGap - rightGap
        const rh = slot.height * usableH - topGap  - botGap

        return (
          <rect
            key={slot.id}
            x={rx} y={ry} width={rw} height={rh}
            rx={3} ry={3}
            fill={active ? 'var(--wt-accent)' : 'currentColor'}
            fillOpacity={active ? 0.25 : 0.12}
            stroke={active ? 'var(--wt-accent)' : 'currentColor'}
            strokeOpacity={active ? 0.6 : 0.25}
            strokeWidth={0.75}
          />
        )
      })}
    </svg>
  )
}
