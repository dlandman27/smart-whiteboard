import { useEffect, useRef, useState } from 'react'
import { useVoice } from '../hooks/useVoice'
import { useBriefingStore } from '../store/briefing'
import { useChatStore } from '../store/chat'
import { soundSuccess } from '../lib/sounds'

// ── Walli avatar ──────────────────────────────────────────────────────────────

function WalliAvatar({ pulse }: { pulse?: boolean }) {
  return (
    <div
      style={{
        width:          36,
        height:         36,
        borderRadius:   '50%',
        background:     'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
        boxShadow:      pulse
          ? '0 0 0 4px rgba(59,130,246,0.25), 0 2px 8px rgba(59,130,246,0.4)'
          : '0 2px 8px rgba(59,130,246,0.3)',
        transition:     'box-shadow 0.3s ease',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width:           8,
            height:          8,
            borderRadius:    '50%',
            background:      'var(--wt-text-muted)',
            animation:       `walli-typing 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({
  text,
  side,
  dim,
}: {
  text: React.ReactNode
  side: 'user' | 'walli'
  dim?: boolean
}) {
  const isUser = side === 'user'
  return (
    <div
      style={{
        maxWidth:        '68vw',
        padding:         '10px 14px',
        borderRadius:    isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background:      isUser
          ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
          : 'color-mix(in srgb, var(--wt-surface) 94%, transparent)',
        backdropFilter:  isUser ? 'none' : 'blur(20px)',
        border:          isUser ? 'none' : '1px solid var(--wt-border)',
        color:           isUser ? '#fff' : 'var(--wt-text)',
        fontSize:        15,
        lineHeight:      1.55,
        fontWeight:      isUser ? 500 : 400,
        boxShadow:       isUser
          ? '0 4px 16px rgba(59,130,246,0.35)'
          : '0 4px 16px rgba(0,0,0,0.12)',
        opacity:         dim ? 0.55 : 1,
        transition:      'opacity 0.3s ease',
        animation:       'walli-bubble-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        wordBreak:       'break-word',
      }}
    >
      {text}
    </div>
  )
}

// ── VoiceListener ─────────────────────────────────────────────────────────────

export function VoiceListener() {
  const { state, transcript, response, error } = useVoice()
  const briefingText  = useBriefingStore((s) => s.text)
  const clearBriefing = useBriefingStore((s) => s.clear)
  const addMessage    = useChatStore((s) => s.addMessage)

  const [briefingResponse, setBriefingResponse] = useState<string | null>(null)
  useEffect(() => {
    if (!briefingText) return
    clearBriefing()
    setBriefingResponse(briefingText)
    addMessage('walli', briefingText)
    soundSuccess()
    fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: briefingText }),
    }).then(async (res) => {
      if (!res.ok || !res.body) return
      const mediaSource = new MediaSource()
      const url         = URL.createObjectURL(mediaSource)
      const audio       = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setBriefingResponse(null) }
      audio.onerror = () => { URL.revokeObjectURL(url); setBriefingResponse(null) }
      mediaSource.addEventListener('sourceopen', async () => {
        let sb: SourceBuffer
        try { sb = mediaSource.addSourceBuffer('audio/mpeg') } catch { return }
        const reader = res.body!.getReader()
        const append = (chunk: Uint8Array) => new Promise<void>((resolve) => {
          if (sb.updating) sb.addEventListener('updateend', () => { sb.appendBuffer(chunk); resolve() }, { once: true })
          else { sb.appendBuffer(chunk); sb.addEventListener('updateend', resolve, { once: true }) }
        })
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) { mediaSource.endOfStream(); break }
            await append(value)
          }
        } catch { mediaSource.endOfStream() }
      }, { once: true })
      await audio.play()
    }).catch(() => setBriefingResponse(null))
  }, [briefingText])

  // ── Persist messages to chat store ───────────────────────────────────────
  const lastTranscriptRef  = useRef('')
  const lastResponseRef    = useRef('')

  useEffect(() => {
    if (state === 'processing' && transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript
      addMessage('user', transcript)
    }
  }, [state, transcript])

  useEffect(() => {
    if (state === 'responding' && response && response !== lastResponseRef.current) {
      lastResponseRef.current = response
      addMessage('walli', response)
    }
  }, [state, response])

  const [blip, setBlip] = useState(false)
  const prevState       = useRef(state)

  useEffect(() => {
    if (prevState.current === 'idle' && state === 'listening') {
      setBlip(true)
      setTimeout(() => setBlip(false), 700)
    }
    prevState.current = state
  }, [state])

  if (state === 'unsupported') return null

  const isActive     = state === 'listening' || state === 'processing' || state === 'responding' || !!briefingResponse
  const walliText    = error ?? briefingResponse ?? (state === 'responding' ? response : null)
  const showTyping   = state === 'processing'
  const showTranscript = !!transcript && (state === 'listening' || state === 'processing' || state === 'responding')

  // Dim the user bubble once walli is speaking
  const dimUser = state === 'responding' || !!briefingResponse

  return (
    <>
      {/* Edge glow overlay */}
      <div
        style={{
          position:      'fixed',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        9998,
          opacity:       isActive ? 1 : 0,
          transition:    'opacity 0.5s ease',
          animation:     isActive
            ? (state === 'processing'
                ? 'siriProcess 1.2s ease-in-out infinite'
                : 'siriEdge 3s linear infinite')
            : 'none',
        }}
      />

      {/* Wake-word blip */}
      {blip && (
        <div
          style={{
            position:      'fixed',
            inset:         0,
            pointerEvents: 'none',
            zIndex:        9997,
            background:    'radial-gradient(ellipse at center, rgba(59,130,246,0.25) 0%, transparent 70%)',
            animation:     'siriBlip 0.7s ease-out forwards',
          }}
        />
      )}

      {/* Chat overlay — bottom-left, clear of center toolbar */}
      {isActive && (
        <div
          style={{
            position:       'fixed',
            bottom:         32,
            left:           32,
            zIndex:         9999,
            pointerEvents:  'none',
            width:          'min(480px, calc(50vw - 48px))',
            display:        'flex',
            flexDirection:  'column',
            gap:            10,
          }}
        >
          {/* User transcript bubble */}
          {showTranscript && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Bubble text={transcript} side="user" dim={dimUser} />
            </div>
          )}

          {/* Walli typing indicator */}
          {showTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <WalliAvatar pulse />
              <Bubble text={<TypingDots />} side="walli" />
            </div>
          )}

          {/* Walli response bubble */}
          {!showTyping && walliText && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <WalliAvatar />
              <Bubble text={walliText} side="walli" />
            </div>
          )}
        </div>
      )}
    </>
  )
}
