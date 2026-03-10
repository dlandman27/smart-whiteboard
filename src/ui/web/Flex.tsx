import React from 'react'
import { cn } from './utils/cn'

type Direction  = 'row' | 'col'
type Align      = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type Justify    = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
type Gap        = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const dirClass:  Record<Direction, string> = {
  row: 'flex-row',
  col: 'flex-col',
}
const alignClass: Record<Align, string> = {
  start:    'items-start',
  center:   'items-center',
  end:      'items-end',
  stretch:  'items-stretch',
  baseline: 'items-baseline',
}
const justifyClass: Record<Justify, string> = {
  start:   'justify-start',
  center:  'justify-center',
  end:     'justify-end',
  between: 'justify-between',
  around:  'justify-around',
  evenly:  'justify-evenly',
}
const gapClass: Record<Gap, string> = {
  none: 'gap-0',
  xs:   'gap-1',
  sm:   'gap-2',
  md:   'gap-4',
  lg:   'gap-6',
  xl:   'gap-8',
}

interface Props {
  dir?:       Direction
  align?:     Align
  justify?:   Justify
  gap?:       Gap
  wrap?:      boolean
  flex1?:     boolean
  className?: string
  children:   React.ReactNode
  as?:        React.ElementType
}

export function Flex({
  dir     = 'row',
  align   = 'start',
  justify = 'start',
  gap     = 'none',
  wrap    = false,
  flex1   = false,
  className,
  children,
  as: Tag = 'div',
}: Props) {
  return (
    <Tag
      className={cn(
        'flex',
        dirClass[dir],
        alignClass[align],
        justifyClass[justify],
        gapClass[gap],
        wrap  && 'flex-wrap',
        flex1 && 'flex-1',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function FlexRow(props: Omit<Props, 'dir'>) {
  return <Flex {...props} dir="row" />
}

export function FlexCol(props: Omit<Props, 'dir'>) {
  return <Flex {...props} dir="col" />
}
