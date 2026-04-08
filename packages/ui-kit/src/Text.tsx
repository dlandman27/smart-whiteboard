import React from 'react'
import { cn } from './utils/cn'
import { typography, type TextVariant, type TextSize } from './theme/typography'
import { textColor, type TextColor } from './theme/color'

export type { TextVariant, TextSize, TextColor }
export type TextAlign     = 'left' | 'center' | 'right' | 'justify'
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'

const defaultTag: Record<TextVariant, React.ElementType> = {
  display: 'h1',
  heading: 'h2',
  title:   'h3',
  body:    'p',
  label:   'span',
  caption: 'span',
}

export interface TextProps {
  variant?:       TextVariant
  size?:          TextSize
  color?:         TextColor
  align?:         TextAlign
  textTransform?: TextTransform
  numberOfLines?: number
  italic?:        boolean
  as?:            React.ElementType
  className?:     string
  style?:         React.CSSProperties
  onClick?:       React.MouseEventHandler
  title?:         string
  children:       React.ReactNode
}

export function Text({
  variant       = 'body',
  size          = 'medium',
  color         = 'default',
  align         = 'left',
  textTransform,
  numberOfLines,
  italic,
  as,
  className,
  style,
  onClick,
  title,
  children,
}: TextProps) {
  const Tag      = as ?? defaultTag[variant]
  const typStyle = typography[variant][size]

  const clampStyle: React.CSSProperties = numberOfLines
    ? {
        display:            '-webkit-box',
        WebkitLineClamp:    numberOfLines,
        WebkitBoxOrient:    'vertical' as const,
        overflow:           'hidden',
      }
    : {}

  return (
    <Tag
      className={cn(className)}
      style={{
        fontSize:      typStyle.fontSize,
        lineHeight:    typStyle.lineHeight,
        fontWeight:    typStyle.fontWeight,
        fontFamily:    typStyle.fontFamily,
        letterSpacing: typStyle.letterSpacing,
        color:         textColor[color],
        textAlign:     align,
        textTransform,
        fontStyle:     italic ? 'italic' : undefined,
        ...clampStyle,
        ...style,
      }}
      onClick={onClick}
      title={title}
    >
      {children}
    </Tag>
  )
}
