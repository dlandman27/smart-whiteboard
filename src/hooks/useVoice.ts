import { useEffect, useRef, useState } from 'react'
import { soundWakeWord, soundProcessingStart, soundSuccess, soundError } from '../lib/sounds'
import { useVoiceStore } from '../store/voice'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/apiFetch'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding' | 'unsupported'

export interface VoiceStatus {
  state:      VoiceState
  transcript: string
  response:   string
  error:      string | null
}

// ── TTS playback ──────────────────────────────────────────────────────────────

let _audio: HTMLAudioElement | null = null

function cancelSpeak() {
  if (_audio) { _audio.pause(); _audio = null }
  window.speechSynthesis?.cancel()
}

async function speak(text: string, onEnd?: () => void) {
  cancelSpeak()
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ text }),
    })
    if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`)

    const mediaSource = new MediaSource()
    const url         = URL.createObjectURL(mediaSource)
    const audio       = new Audio(url)
    _audio            = audio
    const cleanup = () => { URL.revokeObjectURL(url); _audio = null }
    audio.onended = () => { cleanup(); onEnd?.() }
    audio.onerror = () => { cleanup(); onEnd?.() }

    mediaSource.addEventListener('sourceopen', async () => {
      let sb: SourceBuffer
      try { sb = mediaSource.addSourceBuffer('audio/mpeg') } catch { cleanup(); onEnd?.(); return }
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
  } catch {
    if (!('speechSynthesis' in window)) { onEnd?.(); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 1.08
    utt.onend   = () => onEnd?.()
    utt.onerror = () => onEnd?.()
    window.speechSynthesis.speak(utt)
  }
}

// ── Deepgram (on-demand, only active during a command session) ────────────────

const DG_PARAMS = new URLSearchParams({
  model:           'nova-3',
  language:        'en-US',
  encoding:        'opus',
  sample_rate:     '48000',
  channels:        '1',
  interim_results: 'true',
  smart_format:    'true',
  punctuate:       'true',
  endpointing:     '800',
  no_delay:        'true',
})

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

const SR = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
  : null

type ConvMessage = { role: 'user' | 'assistant'; content: string }

export function useVoice(): VoiceStatus {
  const [state,      _setState]    = useState<VoiceState>(SR ? 'idle' : 'unsupported')
  const [transcript, setTranscript] = useState('')
  const [response,   setResponse]   = useState('')
  const [error,      setError]      = useState<string | null>(null)

  const stateRef     = useRef<VoiceState>(SR ? 'idle' : 'unsupported')
  const commandRef   = useRef('')
  const speakingRef  = useRef(false)
  const historyRef   = useRef<ConvMessage[]>([])
  const silenceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Deepgram session refs (created per command, destroyed when done)
  const dgKeyRef      = useRef<string | null>(null)
  const dgWsRef       = useRef<WebSocket | null>(null)
  const dgRecorderRef = useRef<MediaRecorder | null>(null)
  const dgStreamRef   = useRef<MediaStream | null>(null)

  function setState(s: VoiceState) {
    stateRef.current = s
    _setState(s)
    useVoiceStore.getState().setVoiceState(s)
  }

  function clearSilence() {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
  }

  function armSilenceTimer(submit: () => void) {
    clearSilence()
    silenceRef.current = setTimeout(() => {
      if (stateRef.current !== 'listening') return
      const cmd = commandRef.current.trim()
      if (cmd) submit()
      else     endConversation()
    }, 3_000)
  }

  // Tear down any active Deepgram session
  function closeDeeepgram() {
    dgRecorderRef.current?.stop()
    dgRecorderRef.current = null
    dgWsRef.current?.close()
    dgWsRef.current = null
    dgStreamRef.current?.getTracks().forEach((t) => t.stop())
    dgStreamRef.current = null
  }

  function endConversation() {
    clearSilence()
    closeDeeepgram()
    commandRef.current = ''
    historyRef.current = []
    setTranscript('')
    setResponse('')
    setState('idle')
  }

  // Open Deepgram + mic, call onReady when the connection is open
  async function startDeepgramSession(onTranscript: (text: string, isFinal: boolean, speechEnd: boolean) => void) {
    // Fetch key once and cache
    if (!dgKeyRef.current) {
      try {
        const { key } = await apiFetch<{ key: string }>('/api/deepgram/token')
        dgKeyRef.current = key
      } catch {
        console.warn('[voice] Deepgram key unavailable, falling back to Web Speech for command')
        return false
      }
    }

    // Get mic
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      console.warn('[voice] Mic access denied')
      return false
    }
    dgStreamRef.current = stream

    return new Promise<boolean>((resolve) => {
      const url = `wss://api.deepgram.com/v1/listen?access_token=${encodeURIComponent(dgKeyRef.current!)}&${DG_PARAMS}`
      const ws  = new WebSocket(url)
      dgWsRef.current = ws

      ws.onopen = () => {
        const mimeType = pickMimeType()
        if (!mimeType) { ws.close(); resolve(false); return }

        const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24_000 })
        dgRecorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data)
        }
        recorder.start(250)
        resolve(true)
      }

      ws.onmessage = (event) => {
        let msg: any
        try { msg = JSON.parse(event.data) } catch { return }
        if (msg.type !== 'Results') return
        const text    = (msg.channel?.alternatives?.[0]?.transcript ?? '').trim()
        const isFinal = !!msg.is_final
        const speechEnd = !!msg.speech_final
        if (text) onTranscript(text, isFinal, speechEnd)
      }

      ws.onerror = () => { ws.close(); resolve(false) }
      ws.onclose = () => { /* session ended, clean up handled by closeDeeepgram */ }

      setTimeout(() => { if (ws.readyState !== WebSocket.OPEN) { ws.close(); resolve(false) } }, 5_000)
    })
  }

  useEffect(() => {
    if (!SR) return

    const recognition          = new SR()
    recognition.continuous      = true
    recognition.interimResults  = false  // only need finals for wake word
    recognition.lang            = 'en-US'

    // ── Submit to Walli ─────────────────────────────────────────────────────

    async function submitCommand(text: string) {
      clearSilence()
      closeDeeepgram()
      setState('processing')
      setTranscript(text)
      commandRef.current = ''
      historyRef.current.push({ role: 'user', content: text })
      const stopProcessing = soundProcessingStart()

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res  = await fetch('/api/voice', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ text, history: historyRef.current.slice(0, -1) }),
        })
        const data  = await res.json() as { response?: string }
        const reply = data.response || 'Done.'
        stopProcessing()
        soundSuccess()

        historyRef.current.push({ role: 'assistant', content: reply })
        setResponse(reply)
        setState('responding')

        speakingRef.current = true
        const isQuestion = reply.trimEnd().endsWith('?')
        speak(reply, () => {
          speakingRef.current = false
          if (isQuestion) {
            // Follow-up answer — open a fresh Deepgram session
            commandRef.current = ''
            setTranscript('')
            setState('listening')
            startListening()
          } else {
            endConversation()
          }
        })
      } catch {
        stopProcessing()
        soundError()
        speakingRef.current = false
        setError('Command failed')
        setTimeout(() => setError(null), 3_000)
        endConversation()
      }
    }

    // ── Start a Deepgram listening session ──────────────────────────────────

    async function startListening(initialText = '') {
      commandRef.current = initialText
      setTranscript(initialText)

      const ok = await startDeepgramSession((text, isFinal, speechEnd) => {
        if (stateRef.current !== 'listening') return

        // Check for exit phrases
        if (isFinal && /\b(thanks|thank you|goodbye|bye|stop|never\s*mind|cancel)\b/i.test(text)) {
          clearSilence()
          speak('Got it, see you later.')
          setTimeout(endConversation, 1200)
          return
        }

        if (isFinal) {
          commandRef.current = (commandRef.current + ' ' + text).trim()
        }
        setTranscript((commandRef.current + (!isFinal ? ' ' + text : '')).trim())

        if (speechEnd && commandRef.current) {
          clearSilence()
          submitCommand(commandRef.current)
        } else {
          armSilenceTimer(() => submitCommand(commandRef.current))
        }
      })

      if (!ok) {
        // Deepgram unavailable — fall back: just submit whatever Web Speech captured so far
        if (commandRef.current) submitCommand(commandRef.current)
        else endConversation()
      } else {
        // Arm a safety timer in case Deepgram never fires speechEnd
        armSilenceTimer(() => submitCommand(commandRef.current))
      }
    }

    // ── Web Speech — wake word only ─────────────────────────────────────────

    recognition.onresult = (event: any) => {
      if (speakingRef.current) return
      if (stateRef.current !== 'idle') return  // Deepgram handles listening state

      const text  = event.results[event.resultIndex][0].transcript.trim()
      const lower = text.toLowerCase()

      const hasWake = /\b(hey|okay|ok|hello)\s+bo(a?r[de]|red|rd)\b/.test(lower)
                   || /\b(hey\s+)?wall[ey]\b/.test(lower)
      if (!hasWake) return

      console.log('[voice] 🎤 wake word!')
      soundWakeWord()
      historyRef.current = []

      // Grab anything said after the wake word
      const wakeMatch = lower.match(/\b(?:(?:hey|okay|ok|hello)\s+bo(?:a?r[de]|red|rd)|(?:hey\s+)?wall[ey])\b/)
      const after = wakeMatch
        ? text.slice(wakeMatch.index! + wakeMatch[0].length).replace(/^[,.\s]+/, '').trim()
        : ''

      setState('listening')
      startListening(after)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech')   return
      if (event.error === 'aborted')     return
      if (event.error === 'not-allowed') setState('unsupported')
    }

    let stopped      = false
    let restartDelay = 300
    let lastStart    = 0

    recognition.onend = () => {
      if (stopped) return
      // Only restart when idle — during Deepgram sessions we don't need wake word detection
      if (stateRef.current === 'idle' || stateRef.current === 'listening') {
        const duration = Date.now() - lastStart
        restartDelay   = duration < 1000 ? Math.min(restartDelay * 2, 10_000) : 300
        setTimeout(() => {
          if (stopped) return
          lastStart = Date.now()
          try { recognition.start() } catch { /* already running */ }
        }, restartDelay)
      }
    }

    lastStart = Date.now()
    try { recognition.start() } catch { /* ignore */ }

    return () => {
      stopped = true
      try { recognition.stop() } catch { /* ignore */ }
      clearSilence()
      cancelSpeak()
      closeDeeepgram()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, transcript, response, error }
}
