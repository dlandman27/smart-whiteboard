import React from 'react'

export type BadgeColor = 'neutral' | 'success' | 'danger' | 'warning' | 'info'
export type BadgeSize  = 'sm' | 'md'

interface BadgeProps {
  color?:   BadgeColor
  size?:    BadgeSize
  children: React.ReactNode
  style?:   React.CSSProperties
}

const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
  neutral: { bg: 'rgba(128,128,128,0.15)', text: 'var(--wt-text-muted)' },
  success: { bg: 'color-mix(in srgb, var(--wt-success) 15%, transparent)', text: 'var(--wt-success)' },
  danger:  { bg: 'color-mix(in srgb, var(--wt-danger) 15%, transparent)',  text: 'var(--wt-danger)' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  info:    { bg: 'color-mix(in srgb, var(--wt-accent) 15%, transparent)',  text: 'var(--wt-accent)' },
}

const sizeMap: Record<BadgeSize, { fontSize: number; padding: string }> = {
  sm: { fontSize: 10, padding: '2px 8px' },
  md: { fontSize: 12, padding: '3px 10px' },
}

export function Badge({ color = 'neutral', size = 'md', children, style }: BadgeProps) {
  const { bg, text } = colorMap[color]
  const { fontSize, padding } = sizeMap[size]

  return (
    <span
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        borderRadius:   999,
        backgroundColor: bg,
        color:          text,
        fontSize,
        padding,
        fontWeight:     550,
        lineHeight:     1.4,
        whiteSpace:     'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
