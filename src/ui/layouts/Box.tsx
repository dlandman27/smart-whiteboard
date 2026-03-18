import React from 'react'
import { cn } from '../web/utils/cn'

export type BoxOverflow = 'hidden' | 'auto' | 'y-auto' | 'x-auto' | 'visible'

const overflowClass: Record<BoxOverflow, string> = {
  hidden:   'overflow-hidden',
  auto:     'overflow-auto',
  'y-auto': 'overflow-y-auto',
  'x-auto': 'overflow-x-auto',
  visible:  'overflow-visible',
}

export interface BoxProps {
  flex1?:      boolean
  fullHeight?: boolean
  fullWidth?:  boolean
  noSelect?:   boolean
  overflow?:   BoxOverflow
  as?:         React.ElementType
  className?:  string
  style?:      React.CSSProperties
  onClick?:    React.MouseEventHandler
  children?:   React.ReactNode
}

export function Box({
  flex1      = false,
  fullHeight = false,
  fullWidth  = false,
  noSelect   = false,
  overflow,
  as: Tag    = 'div',
  className,
  style,
  onClick,
  children,
}: BoxProps) {
  return (
    <Tag
      className={cn(
        flex1      && 'flex-1',
        fullHeight && 'h-full',
        fullWidth  && 'w-full',
        noSelect   && 'select-none',
        overflow   && overflowClass[overflow],
        className,
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
