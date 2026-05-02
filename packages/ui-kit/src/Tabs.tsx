import React, { useState } from 'react'

export interface TabItem {
  value: string
  label: string
}

interface TabsProps {
  value:    string
  tabs:     TabItem[]
  onChange: (value: string) => void
  style?:   React.CSSProperties
}

export function Tabs({ value, tabs, onChange, style }: TabsProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      style={{
        display:      'flex',
        borderBottom: '1px solid var(--wt-border)',
        gap:          0,
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive  = tab.value === value
        const isHovered = hovered === tab.value

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            onMouseEnter={() => setHovered(tab.value)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding:         '8px 16px',
              fontSize:        13,
              fontWeight:      isActive ? 600 : 500,
              border:          'none',
              background:      'transparent',
              cursor:          'pointer',
              borderBottom:    isActive ? '2px solid var(--wt-accent)' : '2px solid transparent',
              marginBottom:    -1,
              color:           isActive ? 'var(--wt-accent)' : isHovered ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              transition:      'color 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
