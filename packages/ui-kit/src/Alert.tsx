import React from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps {
  variant?:  AlertVariant
  title?:    string
  children?: React.ReactNode
  onDismiss?: () => void
  style?:    React.CSSProperties
}

const variantColor: Record<AlertVariant, string> = {
  info:    'var(--wt-accent)',
  success: 'var(--wt-success)',
  warning: '#f59e0b',
  danger:  'var(--wt-danger)',
}

export function Alert({ variant = 'info', title, children, onDismiss, style }: AlertProps) {
  const color = variantColor[variant]

  return (
    <div
      style={{
        borderRadius:  10,
        padding:       '12px 14px',
        borderLeft:    `3px solid ${color}`,
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        position:      'relative',
        ...style,
      }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position:   'absolute',
            top:        8,
            right:      8,
            border:     'none',
            background: 'transparent',
            cursor:     'pointer',
            color:      'var(--wt-text-muted)',
            fontSize:   16,
            lineHeight: 1,
            padding:    '2px 4px',
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
      {title && (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)', paddingRight: onDismiss ? 20 : 0 }}>
          {title}
        </div>
      )}
      {children && (
        <div
          style={{
            fontSize:   13,
            fontWeight: 400,
            color:      'var(--wt-text-muted)',
            marginTop:  title ? 4 : 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
