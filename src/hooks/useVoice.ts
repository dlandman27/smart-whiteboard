import { useCallback, useEffect, useRef, useState } from 'react'
import { soundWakeWord, soundProcessingStart, soundSuccess, soundError } from '../lib/sounds'
import { useVoiceStore } from '../store/voice'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding' | 'unsupported'

export interface VoiceStatus {
  state:      VoiceState
  transcript: string
  response:   string
  error:      string | null
}

// ── Audio helpers ─────────────────────────────────────────────────────────────


let _audio: HTMLAudioElement | null = null

function cancelSpeak() {
  if (_audio) { _audio.pause(); _audio = null }
  window.speechSynthesis?.cancel()
}

async function speak(text: string, onEnd?: () => void) {
  cancelSpeak()
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`)

    // Stream audio via MediaSource so playback starts with first chunk
    const mediaSource = new MediaSource()
    const url         = URL.createObjectURL(mediaSource)
    const audio       = new Audio(url)
    _audio            = audio

    const cleanup = () => { URL.revokeObjectURL(url); _audio = null }
    audio.onended = () => { cleanup(); onEnd?.() }
    audio.onerror = () => { cleanup(); onEnd?.() }

    mediaSource.addEventListener('sourceopen', async () => {
      let sb: SourceBuffer
      try { sb = mediaSource.addSourceBuffer('audio/mpeg') }
      catch { cleanup(); onEnd?.(); return }

      const reader = res.body!.getReader()
      const append = (chunk: Uint8Array) => new Promise<void>((resolve) => {
        if (sb.updating) {
          sb.addEventListener('updateend', () => { sb.appendBuffer(chunk); resolve() }, { once: true })
        } else {
          sb.appendBuffer(chunk)
          sb.addEventListener('updateend', resolve, { once: true })
        }
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
  } catch {
    // fallback to Web Speech API
    if (!('speechSynthesis' in window)) { onEnd?.(); return }
    const utt   = new SpeechSynthesisUtterance(text)
    utt.rate    = 1.08
    utt.volume  = 0.95
    utt.onend   = () => onEnd?.()
    utt.onerror = () => onEnd?.()
    window.speechSynthesis.speak(utt)
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const SR = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
  : null

// How long of silence before submitting a command (ms)
const COMMAND_SILENCE_MS = 2500

type ConvMessage = { role: 'user' | 'assistant'; content: string }

export function useVoice(): VoiceStatus {
  const [state, _setState] = useState<VoiceState>(SR ? 'idle' : 'unsupported')
  function setState(s: VoiceState) {
    _setState(s)
    useVoiceStore.getState().setVoiceState(s)
  }
  const [transcript, setTranscript] = useState('')
  const [response,   setResponse]   = useState('')
  const [error,      setError]      = useState<string | null>(null)

  const stateRef        = useRef<VoiceState>('idle')
  const commandBufRef   = useRef('')
  const interimBufRef   = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speakingRef     = useRef(false)          // true while TTS is playing
  const inConvoRef      = useRef(false)          // true during a conversation session
  const historyRef      = useRef<ConvMessage[]>([]) // conversation history

  stateRef.current = state

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  function endConversation() {
    inConvoRef.current  = false
    historyRef.current  = []
    commandBufRef.current = ''
    setTranscript('')
    setResponse('')
    setState('idle')
  }

  const resetSilenceTimer = useCallback((submit: () => void, timeoutMs = COMMAND_SILENCE_MS) => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null
      if (stateRef.current === 'listening') {
        const cmd = commandBufRef.current.trim() || interimBufRef.current.trim()
        if (cmd) {
          commandBufRef.current = cmd
          console.log(`[voice] 🚀 "${cmd}"`)
          submit()
        } else {
          // No speech — if in convo, end it; otherwise go idle
          endConversation()
        }
      }
    }, timeoutMs)
  }, [])

  useEffect(() => {
    if (!SR) return

    const recognition         = new SR()
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'en-US'

    // ── Submit to server ────────────────────────────────────────────────────
    async function submitCommand(text: string) {
      setState('processing')
      setTranscript(text)
      commandBufRef.current = ''
      historyRef.current.push({ role: 'user', content: text })
      const stopProcessing = soundProcessingStart()

      try {
        const res  = await fetch('/api/voice', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text, history: historyRef.current.slice(0, -1) }),
        })
        const data  = await res.json() as { response?: string }
        const reply = data.response || 'Done.'
        console.log('[voice] 🤖', reply)
        stopProcessing()
        soundSuccess()

        historyRef.current.push({ role: 'assistant', content: reply })

        setResponse(reply)
        setState('responding')

        // Suppress recognition while speaking so mic doesn't hear TTS
        speakingRef.current = true
        const isQuestion = reply.trimEnd().endsWith('?')
        speak(reply, () => {
          speakingRef.current = false

          if (isQuestion) {
            // Stay listening for the user's answer
            commandBufRef.current = ''
            setTranscript('')
            setState('listening')
            resetSilenceTimer(() => submitCommand(commandBufRef.current), COMMAND_SILENCE_MS)
          } else {
            endConversation()
          }
        })
      } catch {
        stopProcessing()
        soundError()
        speakingRef.current = false
        setError('Command failed')
        setTimeout(() => setError(null), 3000)
        endConversation()
      }
    }

    // ── Process results ─────────────────────────────────────────────────────
    recognition.onresult = (event: any) => {
      // Ignore everything while TTS is playing
      if (speakingRef.current) return

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
        soundWakeWord()
        commandBufRef.current = ''
        inConvoRef.current    = true
        historyRef.current    = []

        const after = text.slice(lower.lastIndexOf('board') + 5).replace(/^[,.\s]+/, '').trim()
        if (after) commandBufRef.current = after

        setState('listening')
        setTranscript(commandBufRef.current)
        resetSilenceTimer(() => submitCommand(commandBufRef.current), COMMAND_SILENCE_MS)

      } else if (cur === 'listening') {
        // Check for conversation-exit phrases
        if (final && /\b(thanks|thank you|goodbye|bye|stop|never ?mind|cancel)\b/.test(lower)) {
          clearSilenceTimer()
          speak('Got it, see you later.')
          setTimeout(() => endConversation(), 1200)
          return
        }

        if (final) {
          commandBufRef.current = (commandBufRef.current + ' ' + text).trim()
          interimBufRef.current = ''
        } else {
          interimBufRef.current = text
        }
        setTranscript((commandBufRef.current + ' ' + (final ? '' : text)).trim())
        resetSilenceTimer(() => submitCommand(commandBufRef.current), COMMAND_SILENCE_MS)
      }
    }

    recognition.onerror = (event: any) => {
      console.log('[voice] ⚠ error:', event.error)
      if (event.error === 'no-speech')   return
      if (event.error === 'aborted')     return
      if (event.error === 'not-allowed') setState('unsupported')
    }

    recognition.onstart = () => console.log('[voice] ▶ started')

    let stopped = false
    let restartDelay = 300
    let lastStartTime = 0
    recognition.onend = () => {
      console.log('[voice] ■ ended, state=', stateRef.current)
      if (stopped) return
      const s = stateRef.current
      if (s === 'idle' || s === 'listening') {
        const sessionDuration = Date.now() - lastStartTime
        if (sessionDuration < 1000) {
          restartDelay = Math.min(restartDelay * 2, 10000)
        } else {
          restartDelay = 300
        }
        setTimeout(() => {
          if (stopped) return
          lastStartTime = Date.now()
          try { recognition.start() } catch { /* already running */ }
        }, restartDelay)
      }
    }

    lastStartTime = Date.now()
    try { recognition.start() } catch { /* ignore */ }

    return () => {
      stopped = true
      try { recognition.stop() } catch { /* ignore */ }
      clearSilenceTimer()
      cancelSpeak()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, transcript, response, error }
}
