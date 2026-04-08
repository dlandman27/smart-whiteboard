import { cn } from './utils/cn'

interface Props {
  label:      string
  children:   React.ReactNode
  className?: string
}

export function SettingsSection({ label, children, className }: Props) {
  return (
    <div className={cn('w-full space-y-2.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>{label}</p>
      {children}
    </div>
  )
}
