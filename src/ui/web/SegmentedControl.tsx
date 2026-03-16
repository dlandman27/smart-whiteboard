import { cn } from './utils/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value:     T
  options:   SegmentedOption<T>[]
  onChange:  (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div className={cn('wt-seg-track flex rounded-lg p-0.5 gap-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
            value === opt.value ? 'wt-seg-active' : 'wt-seg-btn',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
