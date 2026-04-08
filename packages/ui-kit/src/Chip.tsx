import React from 'react'
import { cn } from './utils/cn'

export type ChipVariant = 'default' | 'selected'

const variantClass: Record<ChipVariant, string> = {
  default:  'bg-stone-100 border border-stone-200 text-stone-600 hover:bg-stone-200',
  selected: 'bg-stone-900 border border-stone-900 text-white',
}

interface Props {
  variant?:   ChipVariant
  iconLeft?:  React.ReactNode
  disabled?:  boolean
  onClick?:   () => void
  className?: string
  children:   React.ReactNode
}

export function Chip({
  variant   = 'default',
  iconLeft,
  disabled  = false,
  onClick,
  className,
  children,
}: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantClass[variant],
        className,
      )}
    >
      {iconLeft}
      {children}
    </button>
  )
}
