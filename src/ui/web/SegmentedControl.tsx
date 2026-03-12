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
    <div className={cn('flex bg-stone-100 rounded-lg p-0.5 gap-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
            value === opt.value
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
