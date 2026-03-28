import { IconButton } from './IconButton'
import { cn } from './utils/cn'

interface Props {
  title:      string
  onClose:    () => void
  onBack?:    () => void
  actions?:   React.ReactNode
  className?: string
}

export function PanelHeader({ title, onClose, onBack, actions, className }: Props) {
  return (
    <div
      className={cn('flex items-center gap-2 px-4 py-3 flex-shrink-0', className)}
      style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
    >
      {onBack && <IconButton icon="CaretLeft" size="sm" onClick={onBack} />}
      <span
        className="flex-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--wt-settings-label)' }}
      >
        {title}
      </span>
      {actions}
      <IconButton icon="X" size="sm" onClick={onClose} />
    </div>
  )
}
