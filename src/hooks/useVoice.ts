import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding' | 'unsupported'

export interface VoiceStatus {
  state:      VoiceState
  transcript: string
  response:   string
  error:      string | null
}

// ── Audio helpers ─────────────────────────────────────────────────────────────

function playWakeCue() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 740
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
  } catch { /* ignore */ }
}

function speak(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utt   = new SpeechSynthesisUtterance(text)
  utt.rate    = 1.05
  utt.volume  = 0.9
  utt.onend   = () => onEnd?.()
  utt.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utt)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const SR = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
  : null

export function useVoice(): VoiceStatus {
  const [state,      setState]      = useState<VoiceState>(SR ? 'idle' : 'unsupported')
  const [transcript, setTranscript] = useState('')
  const [response,   setResponse]   = useState('')
  const [error,      setError]      = useState<string | null>(null)

  const stateRef        = useRef<VoiceState>('idle')
  const commandBufRef   = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  stateRef.current = state

  const resetSilenceTimer = useCallback((submit: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null
      if (stateRef.current === 'listening') {
        const cmd = commandBufRef.current.trim()
        if (cmd) {
          console.log(`[voice] 🚀 "${cmd}"`)
          submit()
        } else {
          setState('idle')
        }
      }
    }, 1600)
  }, [])

  useEffect(() => {
    if (!SR) return

    const recognition      = new SR()
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'en-US'

    // ── Submit to server ────────────────────────────────────────────────────
    async function submitCommand(text: string) {
      setState('processing')
      setTranscript(text)
      commandBufRef.current = ''
      try {
        const res   = await fetch('/api/voice', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text }),
        })
        const data  = await res.json() as { response?: string }
        const reply = data.response || 'Done.'
        console.log('[voice] 🤖', reply)
        setResponse(reply)
        setState('idle')
        setResponse('')
        setTranscript('')
      } catch {
        setError('Command failed')
        setTimeout(() => setError(null), 3000)
        setState('idle')
      }
    }

    // ── Process results ─────────────────────────────────────────────────────
    recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex]
      const text   = result[0].transcript.trim()
      const final  = result.isFinal
      const lower  = text.toLowerCase()
      const cur    = stateRef.current

      console.log(`[voice] ${final ? '✓' : '…'} "${text}"  state=${cur}`)

      if (cur === 'idle') {
        const hasWake = /\b(hey|okay|ok|hello)\s+bo(a?r[de]|red|rd)\b/.test(lower)
                     || /\b(hey\s+)?wall[ey]\b/.test(lower)
        if (!hasWake) return

        console.log('[voice] 🎤 wake word!')
        playWakeCue()
        commandBufRef.current = ''

        // Grab anything said after "board" in the same utterance
        const after = text.slice(lower.lastIndexOf('board') + 5).replace(/^[,.\s]+/, '').trim()
        if (after) commandBufRef.current = after

        setState('listening')
        setTranscript(commandBufRef.current)
        resetSilenceTimer(() => submitCommand(commandBufRef.current))

      } else if (cur === 'listening') {
        if (final) commandBufRef.current = (commandBufRef.current + ' ' + text).trim()
        setTranscript((commandBufRef.current + ' ' + (final ? '' : text)).trim())
        resetSilenceTimer(() => submitCommand(commandBufRef.current))
      }
    }

    recognition.onerror = (event: any) => {
      console.log('[voice] ⚠ error:', event.error)
      if (event.error === 'no-speech')   return
      if (event.error === 'aborted')     return
      if (event.error === 'not-allowed') setState('unsupported')
    }

    recognition.onstart = () => console.log('[voice] ▶ started')

    // Keep recognition alive — Chrome stops it after silence; restart with a
    // small delay so Chrome has time to actually release the session first.
    // `stopped` prevents the old instance restarting after intentional cleanup
    // (fixes React StrictMode double-mount abort loop).
    let stopped = false
    recognition.onend = () => {
      console.log('[voice] ■ ended, state=', stateRef.current)
      if (stopped) return
      const s = stateRef.current
      if (s === 'idle' || s === 'listening') {
        setTimeout(() => {
          if (stopped) return
          try { recognition.start() } catch { /* already running */ }
        }, 300)
      }
    }

    try { recognition.start() } catch { /* ignore */ }

    return () => {
      stopped = true
      try { recognition.stop() } catch { /* ignore */ }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, transcript, response, error }
}
