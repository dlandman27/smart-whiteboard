import React from 'react'
import { cn } from './utils/cn'
import { typography } from '../theme/typography'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link' | 'accent'
export type ButtonSize    = 'sm' | 'md' | 'lg'

// Height + padding — layout only, no colors
const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8  px-3',
  md: 'h-9  px-4',
  lg: 'h-11 px-5',
}

// Typography per size — same scale as Text
const typMap = {
  sm: typography.label.medium,
  md: typography.label.large,
  lg: typography.title.small,
}

// Colors — all CSS vars, no hardcoded values
const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  solid:   { backgroundColor: 'var(--wt-text)',   color: 'var(--wt-bg)' },
  outline: { backgroundColor: 'transparent',      color: 'var(--wt-text)',        border: '1px solid var(--wt-border)' },
  ghost:   { backgroundColor: 'transparent',      color: 'var(--wt-text)' },
  link:    { backgroundColor: 'transparent',      color: 'var(--wt-text)' },
  accent:  { backgroundColor: 'var(--wt-accent)', color: 'var(--wt-accent-text)' },
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
  style,
  children,
  ...props
}: ButtonProps) {
  const typ = typMap[size]

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg',
        'transition-opacity hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40',
        variant !== 'link' && sizeClass[size],
        variant === 'link'  && 'underline-offset-4 hover:underline',
        fullWidth && 'w-full',
        className,
      )}
      style={{
        fontSize:   typ.fontSize,
        lineHeight: typ.lineHeight,
        fontWeight: typ.fontWeight,
        fontFamily: typ.fontFamily,
        ...variantStyle[variant],
        ...style,
      }}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}
