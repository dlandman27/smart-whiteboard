import React from 'react'

interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      { label: string; onClick: () => void }
  style?:       React.CSSProperties
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        textAlign:      'center',
        gap:            8,
        ...style,
      }}
    >
      {icon && (
        <div style={{ width: 40, height: 40, color: 'var(--wt-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wt-text)' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--wt-text-muted)' }}>
          {description}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop:       8,
            padding:         '7px 16px',
            borderRadius:    9,
            border:          'none',
            backgroundColor: 'var(--wt-accent)',
            color:           'var(--wt-accent-text)',
            fontSize:        13,
            fontWeight:      600,
            cursor:          'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
