import React from 'react'
import { cn } from './utils/cn'

export type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'label' | 'caption'
export type TextSize    = 'large' | 'medium' | 'small'
export type TextColor   = 'default' | 'muted' | 'accent' | 'disabled'
export type TextAlign   = 'left' | 'center' | 'right'

const variantSize: Record<TextVariant, Record<TextSize, string>> = {
  display: {
    large:  'font-display text-5xl font-bold leading-tight tracking-tight',
    medium: 'font-display text-4xl font-bold leading-tight tracking-tight',
    small:  'font-display text-3xl font-bold leading-tight tracking-tight',
  },
  heading: {
    large:  'font-display text-3xl font-bold leading-snug',
    medium: 'font-display text-2xl font-bold leading-snug',
    small:  'font-display text-xl  font-bold leading-snug',
  },
  title: {
    large:  'font-sans text-xl  font-semibold leading-snug',
    medium: 'font-sans text-base font-semibold leading-snug',
    small:  'font-sans text-sm  font-semibold leading-snug',
  },
  body: {
    large:  'font-sans text-base font-normal leading-relaxed',
    medium: 'font-sans text-sm  font-normal leading-relaxed',
    small:  'font-sans text-xs  font-normal leading-relaxed',
  },
  label: {
    large:  'font-sans text-sm  font-medium leading-none',
    medium: 'font-sans text-xs  font-medium leading-none',
    small:  'font-sans text-[10px] font-medium leading-none',
  },
  caption: {
    large:  'font-sans text-xs    font-normal leading-normal',
    medium: 'font-sans text-[11px] font-normal leading-normal',
    small:  'font-sans text-[10px] font-normal leading-normal',
  },
}

const colorClass: Record<TextColor, string> = {
  default:  'text-stone-900',
  muted:    'text-stone-500',
  accent:   'text-amber-500',
  disabled: 'text-stone-300',
}

const alignClass: Record<TextAlign, string> = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
}

// Default HTML tag per variant
const defaultTag: Record<TextVariant, React.ElementType> = {
  display: 'h1',
  heading: 'h2',
  title:   'h3',
  body:    'p',
  label:   'span',
  caption: 'span',
}

interface Props {
  variant?:   TextVariant
  size?:      TextSize
  color?:     TextColor
  align?:     TextAlign
  as?:        React.ElementType
  className?: string
  style?:     React.CSSProperties
  onClick?:   React.MouseEventHandler
  title?:     string
  children:   React.ReactNode
}

export function Text({
  variant   = 'body',
  size      = 'medium',
  color     = 'default',
  align     = 'left',
  as,
  className,
  style,
  onClick,
  title,
  children,
}: Props) {
  const Tag = as ?? defaultTag[variant]
  return (
    <Tag
      className={cn(
        variantSize[variant][size],
        colorClass[color],
        alignClass[align],
        className,
      )}
      style={style}
      onClick={onClick}
      title={title}
    >
      {children}
    </Tag>
  )
}
