import React from 'react'

export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

const sizeMap: Record<SpacingSize, number> = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
}

interface Props {
  size?:        SpacingSize
  px?:          number
  horizontal?:  boolean
}

export function Spacer({ size = 'md', px, horizontal = false }: Props) {
  const value = px ?? sizeMap[size]
  const style = horizontal
    ? { display: 'inline-block', width: value, flexShrink: 0 }
    : { height: value, flexShrink: 0 }
  return <span style={style} aria-hidden />
}
