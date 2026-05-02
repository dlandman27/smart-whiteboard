import React from 'react'

interface DrawerProps {
  open:     boolean
  onClose:  () => void
  title?:   string
  width?:   number
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, width = 400, children }: DrawerProps) {
  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     100,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {open && (
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'rgba(0,0,0,0.35)',
          }}
          onClick={onClose}
        />
      )}
      <div
        style={{
          position:    'absolute',
          top:         0,
          right:       0,
          bottom:      0,
          width,
          background:  'var(--wt-surface)',
          borderLeft:  '1px solid var(--wt-border)',
          display:     'flex',
          flexDirection: 'column',
          boxShadow:   'var(--wt-shadow-lg)',
          transform:   open ? 'translateX(0)' : 'translateX(100%)',
          transition:  'transform 0.25s ease',
        }}
      >
        <div
          style={{
            padding:        '20px 20px 0',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexShrink:     0,
          }}
        >
          {title && (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--wt-text)' }}>
              {title}
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              border:     'none',
              background: 'transparent',
              cursor:     'pointer',
              color:      'var(--wt-text-muted)',
              fontSize:   18,
              lineHeight: 1,
              padding:    '2px 4px',
              marginLeft: 'auto',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
