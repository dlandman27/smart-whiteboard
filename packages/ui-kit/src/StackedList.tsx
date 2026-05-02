import React, { useState } from 'react'

interface StackedListProps {
  children: React.ReactNode
  style?:   React.CSSProperties
}

interface StackedListItemProps {
  children: React.ReactNode
  onClick?: () => void
  style?:   React.CSSProperties
}

export function StackedList({ children, style }: StackedListProps) {
  const items = React.Children.toArray(children)

  return (
    <ul
      style={{
        listStyle:    'none',
        margin:       0,
        padding:      0,
        borderRadius: 10,
        border:       '1px solid var(--wt-border)',
        overflow:     'hidden',
        ...style,
      }}
    >
      {items.map((child, index) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<StackedListItemProps & { _isLast?: boolean }>, {
          _isLast: index === items.length - 1,
        })
      })}
    </ul>
  )
}

export function StackedListItem({
  children,
  onClick,
  style,
  ...rest
}: StackedListItemProps & { _isLast?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const isLast = (rest as { _isLast?: boolean })._isLast

  return (
    <li
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:         '10px 14px',
        borderBottom:    isLast ? 'none' : '1px solid var(--wt-border)',
        background:      hovered && onClick ? 'var(--wt-surface-hover)' : 'transparent',
        cursor:          onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </li>
  )
}
