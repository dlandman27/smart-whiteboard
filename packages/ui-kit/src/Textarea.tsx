import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string
  error?:  string
  style?:  React.CSSProperties
}

export function Textarea({ label, error, style, ...props }: TextareaProps) {
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
      <textarea
        rows={4}
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
          resize:      'vertical',
          fontFamily:  'inherit',
        }}
      />
      {error && (
        <span style={{ fontSize: 11, color: 'var(--wt-danger)', marginTop: 4 }}>
          {error}
        </span>
      )}
    </div>
  )
}
