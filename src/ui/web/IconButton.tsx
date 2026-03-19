import React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from './utils/cn'

export type IconButtonVariant = 'default' | 'active' | 'ghost'
export type IconButtonSize    = 'sm' | 'md' | 'lg' | 'xl'

const variantClass: Record<IconButtonVariant, string> = {
  default: 'wt-ibtn',
  active:  'wt-ibtn-active',
  ghost:   'wt-ibtn-ghost',
}

const sizeClass: Record<IconButtonSize, { button: string; icon: number }> = {
  sm: { button: 'p-1',    icon: 13 },
  md: { button: 'p-1.5',  icon: 14 },
  lg: { button: 'p-2',    icon: 16 },
  xl: { button: 'p-2.5',  icon: 20 },
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
        'rounded-md transition-colors disabled:opacity-20 disabled:cursor-not-allowed',
        button,
        variantClass[variant],
        className,
      )}
    >
      <IconComponent size={icon} fill={filled || variant === 'active' ? 'currentColor' : 'none'} />
    </button>
  )
}
