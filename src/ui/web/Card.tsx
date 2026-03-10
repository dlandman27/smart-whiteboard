import React from 'react'
import { cn } from './utils/cn'

export type CardTone    = 'default' | 'accent' | 'flat'
export type CardRadius  = 'sm' | 'md' | 'lg' | 'xl'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const toneClass: Record<CardTone, string> = {
  default: 'bg-white border border-stone-200 shadow-sm',
  accent:  'bg-amber-50 border border-amber-200',
  flat:    'bg-stone-50 border border-stone-100',
}

const radiusClass: Record<CardRadius, string> = {
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
}

const paddingClass: Record<CardPadding, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

interface Props {
  tone?:      CardTone
  radius?:    CardRadius
  padding?:   CardPadding
  className?: string
  children:   React.ReactNode
}

export function Card({
  tone    = 'default',
  radius  = 'xl',
  padding = 'md',
  className,
  children,
}: Props) {
  return (
    <div className={cn(toneClass[tone], radiusClass[radius], paddingClass[padding], className)}>
      {children}
    </div>
  )
}
