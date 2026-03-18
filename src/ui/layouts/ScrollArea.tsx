import React from 'react'
import { cn } from '../web/utils/cn'

export interface ScrollAreaProps {
  axis?:      'y' | 'x' | 'both'
  flex1?:     boolean
  className?: string
  style?:     React.CSSProperties
  children:   React.ReactNode
}

// Scrollable container — flex-1, min-h-0, and overflow on the chosen axis.
// min-h-0 prevents a flex child from overflowing its parent.
export function ScrollArea({
  axis      = 'y',
  flex1     = true,
  className,
  style,
  children,
}: ScrollAreaProps) {
  return (
    <div
      className={cn(
        flex1 && 'flex-1',
        'min-h-0',
        axis === 'y'    && 'overflow-y-auto',
        axis === 'x'    && 'overflow-x-auto',
        axis === 'both' && 'overflow-auto',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}
