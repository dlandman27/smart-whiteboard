import { cn } from './utils/cn'

interface Props {
  icon:          React.ReactNode
  iconBg?:       string
  iconStyle?:    React.CSSProperties
  name:          string
  source?:       string
  label?:        string
  selected?:     boolean
  disabled?:     boolean
  onClick:       () => void
  onMouseEnter?: () => void
  className?:    string
}

export function MenuItem({
  icon, iconBg, iconStyle,
  name, source, label,
  selected, disabled,
  onClick, onMouseEnter,
  className,
}: Props) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-[10px] transition-colors disabled:opacity-40',
        className,
      )}
      style={{ backgroundColor: selected ? 'var(--wt-surface-hover)' : 'transparent' }}
    >
      <div
        className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}
        style={iconStyle}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--wt-text)' }}>{name}</span>
        {source && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--wt-text-muted)' }}>{source}</span>
        )}
      </div>
      {label && (
        <span
          className="text-xs flex-shrink-0 transition-opacity"
          style={{ color: 'var(--wt-text-muted)', opacity: selected ? 1 : 0 }}
        >
          {label}
        </span>
      )}
    </button>
  )
}
