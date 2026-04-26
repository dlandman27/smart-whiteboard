import { Icon } from '@whiteboard/ui-kit'

export type SlotMode = 'hidden' | 'place' | 'swap'

interface Props {
  id: string
  x: number
  y: number
  width: number
  height: number
  mode: SlotMode
  isHovered: boolean
  onClick?: () => void
}

export function LayoutSlot({ x, y, width, height, mode, isHovered, onClick }: Props) {
  if (mode === 'hidden') return null

  const isSwap = mode === 'swap'

  const borderColor = isSwap
    ? (isHovered ? '#f97316' : '#fb923c')   // orange for swap
    : (isHovered ? 'var(--wt-accent)' : 'var(--wt-accent)')

  const bgColor = isSwap
    ? (isHovered ? 'color-mix(in srgb, #f97316 18%, transparent)' : 'color-mix(in srgb, #fb923c 8%, transparent)')
    : (isHovered ? 'color-mix(in srgb, var(--wt-accent) 18%, transparent)' : 'color-mix(in srgb, var(--wt-accent) 8%, transparent)')

  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width, height, zIndex: 5 }}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
    >
      <div
        className={`w-full h-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150 flex items-center justify-center ${!isHovered ? 'animate-pulse' : ''}`}
        style={{ borderColor, backgroundColor: bgColor }}
      >
        {isSwap && isHovered && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: '#f97316', color: '#fff' }}
          >
            <Icon icon="ArrowsLeftRight" size={12} />
            Swap
          </div>
        )}
      </div>
    </div>
  )
}
