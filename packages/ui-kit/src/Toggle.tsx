import { cn } from './utils/cn'

interface Props {
  value:      boolean
  label:      string
  onChange:   (value: boolean) => void
  className?: string
}

export function Toggle({ value, label, onChange, className }: Props) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-xs" style={{ color: 'var(--wt-text)' }}>{label}</span>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onChange(!value)}
        className="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ backgroundColor: value ? 'var(--wt-accent)' : 'var(--wt-border-active)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200"
          style={{ left: value ? '18px' : '2px', backgroundColor: 'var(--wt-bg)' }}
        />
      </button>
    </div>
  )
}
