import React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from './utils/cn'

export type IconButtonVariant = 'default' | 'active' | 'ghost'
export type IconButtonSize    = 'sm' | 'md' | 'lg'

const variantClass: Record<IconButtonVariant, string> = {
  default: 'text-stone-400 hover:text-stone-700 hover:bg-stone-100',
  active:  'bg-stone-900 text-white',
  ghost:   'text-stone-400 hover:text-stone-600',
}

const sizeClass: Record<IconButtonSize, { button: string; icon: number }> = {
  sm: { button: 'p-1',   icon: 13 },
  md: { button: 'p-1.5', icon: 14 },
  lg: { button: 'p-2',   icon: 16 },
}

interface Props {
  icon:       LucideIcon
  variant?:   IconButtonVariant
  size?:      IconButtonSize
  filled?:    boolean
  title?:     string
  disabled?:  boolean
  className?: string
  onClick?:   React.MouseEventHandler<HTMLButtonElement>
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>
}

export function IconButton({
  icon: IconComponent,
  variant   = 'default',
  size      = 'md',
  filled    = false,
  title,
  disabled,
  className,
  onClick,
  onMouseDown,
}: Props) {
  const { button, icon } = sizeClass[size]
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed',
        button,
        variantClass[variant],
        className,
      )}
    >
      <IconComponent size={icon} fill={filled || variant === 'active' ? 'currentColor' : 'none'} />
    </button>
  )
}
