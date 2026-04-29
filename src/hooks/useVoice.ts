import { useCallback, useEffect, useRef, useState } from 'react'
import { soundWakeWord, soundProcessingStart, soundSuccess, soundError } from '../lib/sounds'
import { useVoiceStore } from '../store/voice'
import { supabase } from '../lib/supabase'

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
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
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

const hasMic = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const COMMAND_SILENCE_MS = 2500

type ConvMessage = { role: 'user' | 'assistant'; content: string }

export function useVoice(): VoiceStatus {
  const [state, _setState] = useState<VoiceState>(hasMic ? 'idle' : 'unsupported')
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
  const speakingRef     = useRef(false)
  const inConvoRef      = useRef(false)
  const historyRef      = useRef<ConvMessage[]>([])

  stateRef.current = state

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  function endConversation() {
    inConvoRef.current    = false
    historyRef.current    = []
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
          endConversation()
        }
      }
    }, timeoutMs)
  }, [])

  useEffect(() => {
    if (!hasMic) return

    let stopped      = false
    let wsRef: WebSocket | null = null
    let streamRef: MediaStream | null = null
    let audioCtxRef: AudioContext | null = null
    let processorRef: ScriptProcessorNode | null = null
    let reconnectDelay = 1000

    // ── Submit to server ──────────────────────────────────────────────────────
    async function submitCommand(text: string) {
      setState('processing')
      setTranscript(text)
      commandBufRef.current = ''
      historyRef.current.push({ role: 'user', content: text })
      const stopProcessing = soundProcessingStart()

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res  = await fetch('/api/voice', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ text, history: historyRef.current.slice(0, -1) }),
        })
        const data  = await res.json() as { response?: string }
        const reply = data.response || 'Done.'
        console.log('[voice] 🤖', reply)
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

    // ── Handle Deepgram transcript ────────────────────────────────────────────
    function handleTranscript(text: string, isFinal: boolean) {
      if (speakingRef.current || !text) return

      const lower = text.toLowerCase()
      const cur   = stateRef.current

      console.log(`[voice] ${isFinal ? '✓' : '…'} "${text}"  state=${cur}`)

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
        if (isFinal && /\b(thanks|thank you|goodbye|bye|stop|never ?mind|cancel)\b/.test(lower)) {
          clearSilenceTimer()
          speak('Got it, see you later.')
          setTimeout(() => endConversation(), 1200)
          return
        }

        if (isFinal) {
          commandBufRef.current = (commandBufRef.current + ' ' + text).trim()
          interimBufRef.current = ''
        } else {
          interimBufRef.current = text
        }
        setTranscript((commandBufRef.current + ' ' + (isFinal ? '' : text)).trim())
        resetSilenceTimer(() => submitCommand(commandBufRef.current), COMMAND_SILENCE_MS)
      }
    }

    // ── Deepgram WebSocket ────────────────────────────────────────────────────
    async function connect() {
      if (stopped) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const tokenRes = await fetch('/api/deepgram/token', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!tokenRes.ok) throw new Error('No Deepgram token')
        const { key } = await tokenRes.json() as { key: string }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef = stream

        const audioCtx = new AudioContext({ sampleRate: 16000 })
        audioCtxRef = audioCtx
        const source    = audioCtx.createMediaStreamSource(stream)
        const processor = audioCtx.createScriptProcessor(4096, 1, 1)
        processorRef    = processor
        source.connect(processor)
        processor.connect(audioCtx.destination)

        const ws = new WebSocket(
          'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=en-US&interim_results=true',
          ['token', key]
        )
        wsRef = ws

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const float32 = e.inputBuffer.getChannelData(0)
          const int16   = new Int16Array(float32.length)
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
          }
          ws.send(int16.buffer)
        }

        ws.onopen    = () => { console.log('[voice] ▶ deepgram connected'); reconnectDelay = 1000 }
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string)
            if (msg.type !== 'Results') return
            const text    = (msg.channel?.alternatives?.[0]?.transcript ?? '').trim()
            const isFinal = !!msg.is_final
            handleTranscript(text, isFinal)
          } catch { /* ignore parse errors */ }
        }
        ws.onerror = () => console.log('[voice] ⚠ deepgram error')
        ws.onclose = () => {
          console.log('[voice] ■ deepgram closed')
          cleanup(false)
          if (!stopped) {
            setTimeout(() => connect(), reconnectDelay)
            reconnectDelay = Math.min(reconnectDelay * 2, 15000)
          }
        }
      } catch (err) {
        console.log('[voice] ⚠ connect failed:', err)
        if ((err as any)?.name === 'NotAllowedError') {
          setState('unsupported')
        } else if (!stopped) {
          setTimeout(() => connect(), reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, 15000)
        }
      }
    }

    function cleanup(full = true) {
      processorRef?.disconnect()
      processorRef = null
      audioCtxRef?.close()
      audioCtxRef = null
      if (full) {
        streamRef?.getTracks().forEach(t => t.stop())
        streamRef = null
        wsRef?.close()
        wsRef = null
      }
    }

    connect()

    return () => {
      stopped = true
      cleanup(true)
      clearSilenceTimer()
      cancelSpeak()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, transcript, response, error }
}
