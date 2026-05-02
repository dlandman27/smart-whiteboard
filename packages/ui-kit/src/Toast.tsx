import React from 'react'
import { useToastMessages, ToastVariant } from './useToast'

const variantColor: Record<ToastVariant, string> = {
  info:    'var(--wt-accent)',
  success: 'var(--wt-success)',
  warning: '#f59e0b',
  danger:  'var(--wt-danger)',
}

export function Toaster() {
  const messages = useToastMessages()

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         20,
        right:          20,
        zIndex:         200,
        display:        'flex',
        flexDirection:  'column',
        gap:            8,
        alignItems:     'flex-end',
        pointerEvents:  'none',
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            borderRadius:    10,
            background:      'var(--wt-surface)',
            border:          '1px solid var(--wt-border)',
            boxShadow:       'var(--wt-shadow-md)',
            padding:         '12px 16px',
            display:         'flex',
            alignItems:      'flex-start',
            gap:             10,
            minWidth:        280,
            maxWidth:        380,
            pointerEvents:   'auto',
          }}
        >
          <div
            style={{
              width:       3,
              borderRadius: 999,
              alignSelf:   'stretch',
              flexShrink:  0,
              backgroundColor: variantColor[msg.variant],
            }}
          />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>
            {msg.message}
          </div>
        </div>
      ))}
    </div>
  )
}
