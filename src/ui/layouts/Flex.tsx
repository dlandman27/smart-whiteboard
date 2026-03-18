import React from 'react'
import { cn } from '../web/utils/cn'

export type FlexDir     = 'row' | 'col'
export type FlexAlign   = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
export type FlexGap     = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FlexOverflow = 'hidden' | 'auto' | 'y-auto' | 'x-auto' | 'visible'

const dirClass: Record<FlexDir, string> = {
  row: 'flex-row',
  col: 'flex-col',
}
const alignClass: Record<FlexAlign, string> = {
  start:    'items-start',
  center:   'items-center',
  end:      'items-end',
  stretch:  'items-stretch',
  baseline: 'items-baseline',
}
const justifyClass: Record<FlexJustify, string> = {
  start:   'justify-start',
  center:  'justify-center',
  end:     'justify-end',
  between: 'justify-between',
  around:  'justify-around',
  evenly:  'justify-evenly',
}
const gapClass: Record<FlexGap, string> = {
  none: 'gap-0',
  xs:   'gap-1',
  sm:   'gap-2',
  md:   'gap-4',
  lg:   'gap-6',
  xl:   'gap-8',
}
const overflowClass: Record<FlexOverflow, string> = {
  hidden:   'overflow-hidden',
  auto:     'overflow-auto',
  'y-auto': 'overflow-y-auto',
  'x-auto': 'overflow-x-auto',
  visible:  'overflow-visible',
}

export interface FlexProps {
  dir?:        FlexDir
  align?:      FlexAlign
  justify?:    FlexJustify
  gap?:        FlexGap
  wrap?:       boolean
  flex1?:      boolean
  fullHeight?: boolean
  fullWidth?:  boolean
  noSelect?:   boolean
  overflow?:   FlexOverflow
  as?:         React.ElementType
  className?:  string
  style?:      React.CSSProperties
  onClick?:    React.MouseEventHandler
  children:    React.ReactNode
}

export function Flex({
  dir        = 'row',
  align      = 'start',
  justify    = 'start',
  gap        = 'none',
  wrap       = false,
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
}: FlexProps) {
  return (
    <Tag
      className={cn(
        'flex',
        dirClass[dir],
        alignClass[align],
        justifyClass[justify],
        gapClass[gap],
        wrap       && 'flex-wrap',
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

export function FlexRow(props: Omit<FlexProps, 'dir'>) {
  return <Flex {...props} dir="row" />
}

export function FlexCol(props: Omit<FlexProps, 'dir'>) {
  return <Flex {...props} dir="col" />
}
