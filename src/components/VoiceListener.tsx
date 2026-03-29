import { useEffect, useRef, useState } from 'react'
import { useVoice } from '../hooks/useVoice'

export function VoiceListener() {
  const { state, transcript, response, error } = useVoice()
  const [blip, setBlip]   = useState(false)
  const prevState         = useRef(state)

  // Trigger blip on wake word
  useEffect(() => {
    if (prevState.current === 'idle' && state === 'listening') {
      setBlip(true)
      setTimeout(() => setBlip(false), 700)
    }
    prevState.current = state
  }, [state])

  if (state === 'unsupported') return null

  const isActive    = state === 'listening' || state === 'processing' || state === 'responding'
  const displayText = error ?? (state === 'responding' ? response : transcript)

  return (
    <>
      {/* Edge glow overlay */}
      <div
        style={{
          position:      'fixed',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        9998,
          borderRadius:  0,
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

      {/* Transcript / response label */}
      {isActive && displayText && (
        <div
          style={{
            position:       'fixed',
            bottom:         32,
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         9999,
            pointerEvents:  'none',
            background:     'color-mix(in srgb, var(--wt-surface) 88%, transparent)',
            backdropFilter: 'blur(16px)',
            border:         '1px solid var(--wt-border)',
            borderRadius:   24,
            padding:        '8px 20px',
            fontSize:       14,
            color:          state === 'responding' ? 'var(--wt-accent)' : 'var(--wt-text)',
            whiteSpace:     'nowrap',
            maxWidth:       '60vw',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
            animation:      'fadeIn 0.2s ease',
          }}
        >
          {displayText}
        </div>
      )}
    </>
  )
}
