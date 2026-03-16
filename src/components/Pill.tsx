import React from 'react'
import { cn } from '../ui/web/utils/cn'

interface Props {
  className?: string
  style?:     React.CSSProperties
  children:   React.ReactNode
}

export function Pill({ className, style, children }: Props) {
  return (
    <div className={cn('wt-pill border rounded-2xl', className)} style={style}>
      {children}
    </div>
  )
}
