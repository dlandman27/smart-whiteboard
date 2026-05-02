import React from 'react'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title?:   string
  width?:   number
  children: React.ReactNode
  footer?:  React.ReactNode
}

export function Modal({ open, onClose, title, width = 480, children, footer }: ModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          100,
        background:      'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          borderRadius:    16,
          background:      'var(--wt-surface)',
          border:          '1px solid var(--wt-border)',
          padding:         '24px 24px 20px',
          boxShadow:       'var(--wt-shadow-lg)',
          width,
          maxWidth:        '90vw',
          boxSizing:       'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--wt-text)' }}>
            {title}
          </div>
        )}
        <div>{children}</div>
        {footer && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
