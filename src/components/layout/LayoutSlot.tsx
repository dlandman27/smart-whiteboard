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
    ? (isHovered ? '#f97316' : 'rgba(251,146,60,0.45)')
    : (isHovered ? 'var(--wt-accent)' : 'color-mix(in srgb, var(--wt-accent) 45%, transparent)')

  const bgColor = isSwap
    ? (isHovered ? 'color-mix(in srgb, #f97316 22%, transparent)' : 'color-mix(in srgb, #fb923c 7%, transparent)')
    : (isHovered ? 'color-mix(in srgb, var(--wt-accent) 18%, transparent)' : 'color-mix(in srgb, var(--wt-accent) 6%, transparent)')

  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width, height, zIndex: isSwap ? 200 : 50, padding: 6, animation: 'slot-appear 0.18s ease-out' }}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
    >
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        style={{
          borderRadius:   '3rem',
          border:         `1.5px solid ${borderColor}`,
          background:     bgColor,
          backdropFilter: 'blur(2px)',
          transform:      isHovered ? 'scale(0.96)' : 'scale(1)',
          boxShadow:      isHovered
            ? `0 0 0 3px ${isSwap ? 'rgba(249,115,22,0.35)' : 'color-mix(in srgb, var(--wt-accent) 35%, transparent)'}, 0 8px 24px rgba(0,0,0,0.18)`
            : 'none',
          transition:     'transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1), box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease',
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            opacity:    isHovered ? 1 : 0.35,
            transform:  isHovered ? 'scale(1.15)' : 'scale(1)',
            transition: 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1)',
          }}
        >
          <Icon
            icon={isSwap ? 'ArrowsLeftRight' : 'Plus'}
            size={isHovered ? 22 : 18}
            style={{ color: isSwap ? (isHovered ? '#f97316' : '#fb923c') : 'var(--wt-accent)' }}
          />
          {isSwap && isHovered && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f97316' }}>Swap</span>
          )}
        </div>
      </div>
    </div>
  )
}
