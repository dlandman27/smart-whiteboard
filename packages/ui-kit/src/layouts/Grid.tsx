import React from 'react'
import { cn } from '../utils/cn'

export type GridGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const gapClass: Record<GridGap, string> = {
  none: 'gap-0',
  xs:   'gap-1',
  sm:   'gap-2',
  md:   'gap-4',
  lg:   'gap-6',
  xl:   'gap-8',
}

// Static strings required for Tailwind JIT to detect these classes
const colsClass: Record<number, string> = {
  1:  'grid-cols-1',
  2:  'grid-cols-2',
  3:  'grid-cols-3',
  4:  'grid-cols-4',
  5:  'grid-cols-5',
  6:  'grid-cols-6',
  7:  'grid-cols-7',
  8:  'grid-cols-8',
  9:  'grid-cols-9',
  10: 'grid-cols-10',
  12: 'grid-cols-12',
}

export interface GridProps {
  cols?:       number
  gap?:        GridGap
  flex1?:      boolean
  fullHeight?: boolean
  as?:         React.ElementType
  className?:  string
  style?:      React.CSSProperties
  children:    React.ReactNode
}

export function Grid({
  cols       = 1,
  gap        = 'none',
  flex1      = false,
  fullHeight = false,
  as: Tag    = 'div',
  className,
  style,
  children,
}: GridProps) {
  return (
    <Tag
      className={cn(
        'grid',
        colsClass[cols],
        gapClass[gap],
        flex1      && 'flex-1',
        fullHeight && 'h-full',
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  )
}
