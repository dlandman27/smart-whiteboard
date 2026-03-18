import { cn } from './utils/cn'
import { Text } from './Text'

interface Props {
  label:      string
  checked:    boolean
  onChange:   (checked: boolean) => void
  className?: string
}

export function Checkbox({ label, checked, onChange, className }: Props) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer select-none', className)}>
      <input
        type="checkbox"
        checked={checked}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded cursor-pointer"
        style={{ accentColor: 'var(--wt-accent)' }}
      />
      <Text variant="body" size="small">{label}</Text>
    </label>
  )
}
