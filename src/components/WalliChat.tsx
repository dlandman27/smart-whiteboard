import { Logo } from './Logo'
import { useChatStore } from '../store/chat'

export function WalliChatButton() {
  const toggle  = useChatStore((s) => s.toggle)
  const isOpen  = useChatStore((s) => s.isOpen)
  const hasMsgs = useChatStore((s) => s.messages.length > 0)

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
      title={isOpen ? 'Close chat' : 'Open Walli chat'}
    >
      <Logo size={24} />
      {hasMsgs && !isOpen && (
        <div style={{
          position:     'absolute',
          top:          -2,
          right:        -2,
          width:        7,
          height:       7,
          borderRadius: '50%',
          background:   'var(--wt-accent)',
        }} />
      )}
    </button>
  )
}
