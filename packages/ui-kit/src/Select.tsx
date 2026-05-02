import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:  string
  error?:  string
  style?:  React.CSSProperties
}

export function Select({ label, error, style, children, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', ...style }}>
      {label && (
        <label
          style={{
            display:       'block',
            fontSize:      12,
            fontWeight:    550,
            color:         'var(--wt-text-muted)',
            marginBottom:  6,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          width:       '100%',
          padding:     '8px 12px',
          borderRadius: 9,
          fontSize:    14,
          border:      `1.5px solid ${error ? 'var(--wt-danger)' : 'var(--wt-border)'}`,
          background:  'var(--wt-bg)',
          color:       'var(--wt-text)',
          outline:     'none',
          boxSizing:   'border-box',
          cursor:      'pointer',
          appearance:  'none',
        }}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--wt-danger)', marginTop: 4 }}>
          {error}
        </span>
      )}
    </div>
  )
}
