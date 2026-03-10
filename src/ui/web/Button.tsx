import React from 'react'
import { cn } from './utils/cn'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link'
export type ButtonSize    = 'sm' | 'md' | 'lg'

const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:pointer-events-none disabled:opacity-40'

const variantClass: Record<ButtonVariant, string> = {
  solid:   'bg-stone-900 text-white hover:bg-stone-700',
  outline: 'border border-stone-300 text-stone-700 hover:bg-stone-50',
  ghost:   'text-stone-700 hover:bg-stone-100',
  link:    'text-stone-700 underline-offset-4 hover:underline p-0 h-auto',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 h-8',
  md: 'text-sm px-4 py-2   h-9',
  lg: 'text-base px-5 py-2.5 h-11',
}

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  iconLeft?:  React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

export function Button({
  variant   = 'solid',
  size      = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        base,
        variantClass[variant],
        variant !== 'link' && sizeClass[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}
