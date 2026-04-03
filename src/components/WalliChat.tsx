import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat'
import { Logo } from './Logo'

export function WalliChatButton() {
  const toggle   = useChatStore((s) => s.toggle)
  const isOpen   = useChatStore((s) => s.isOpen)
  const hasmsgs  = useChatStore((s) => s.messages.length > 0)

  return (
    <button
      onPointerDown={(e) => { e.stopPropagation(); toggle() }}
      style={{
        background:    'none',
        border:        'none',
        padding:       0,
        cursor:        'pointer',
        pointerEvents: 'auto',
        position:      'relative',
        opacity:       isOpen ? 1 : 0.4,
        transition:    'opacity 0.2s ease',
      }}
      onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
      onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.opacity = '0.4' }}
      title="Open Walli chat"
    >
      <Logo size={24} />
      {/* Unread dot */}
      {hasmsgs && !isOpen && (
        <div style={{
          position:   'absolute',
          top:        -2,
          right:      -2,
          width:      7,
          height:     7,
          borderRadius: '50%',
          background: 'var(--wt-accent)',
        }} />
      )}
    </button>
  )
}

export function WalliChatPanel() {
  const messages = useChatStore((s) => s.messages)
  const isOpen   = useChatStore((s) => s.isOpen)
  const close    = useChatStore((s) => s.close)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         56,
        left:           16,
        width:          360,
        maxHeight:      '60vh',
        zIndex:         9990,
        display:        'flex',
        flexDirection:  'column',
        borderRadius:   16,
        overflow:       'hidden',
        background:     'color-mix(in srgb, var(--wt-surface) 92%, transparent)',
        backdropFilter: 'blur(24px)',
        border:         '1px solid var(--wt-border)',
        boxShadow:      '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
        animation:      'walli-bubble-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 16px 10px',
        borderBottom:   '1px solid var(--wt-border)',
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width:          28,
            height:         28,
            borderRadius:   '50%',
            background:     'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       13,
          }}>✦</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wt-text)' }}>Walli</span>
        </div>
        <button
          onPointerDown={(e) => { e.stopPropagation(); close() }}
          style={{
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'var(--wt-text-muted)',
            fontSize:   18,
            lineHeight: 1,
            padding:    '2px 4px',
          }}
        >×</button>
      </div>

      {/* Messages */}
      <div style={{
        flex:        1,
        overflowY:   'auto',
        padding:     '12px 12px 4px',
        display:     'flex',
        flexDirection: 'column',
        gap:         8,
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign:  'center',
            color:      'var(--wt-text-muted)',
            fontSize:   13,
            padding:    '24px 0',
          }}>
            Say "Hey Walli" to get started
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display:        'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems:     'flex-end',
                gap:            6,
              }}
            >
              {msg.role === 'walli' && (
                <div style={{
                  width:          22,
                  height:         22,
                  borderRadius:   '50%',
                  background:     'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       10,
                  flexShrink:     0,
                }}>✦</div>
              )}
              <div style={{
                maxWidth:     '75%',
                padding:      '8px 12px',
                borderRadius: msg.role === 'user'
                  ? '14px 14px 3px 14px'
                  : '14px 14px 14px 3px',
                background:   msg.role === 'user'
                  ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                  : 'var(--wt-surface-hover)',
                border:       msg.role === 'walli' ? '1px solid var(--wt-border)' : 'none',
                color:        msg.role === 'user' ? '#fff' : 'var(--wt-text)',
                fontSize:     13,
                lineHeight:   1.5,
              }}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer hint */}
      <div style={{
        padding:    '8px 16px 10px',
        fontSize:   11,
        color:      'var(--wt-text-muted)',
        textAlign:  'center',
        borderTop:  '1px solid var(--wt-border)',
        flexShrink: 0,
      }}>
        Voice-activated · Say "Hey Walli"
      </div>
    </div>
  )
}
