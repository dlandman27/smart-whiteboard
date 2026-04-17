import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../lib/sounds', () => ({
  soundWakeWord:       vi.fn(),
  soundProcessingStart: vi.fn(() => vi.fn()), // returns a stop fn
  soundSuccess:        vi.fn(),
  soundError:          vi.fn(),
}))

vi.mock('../store/voice', () => ({
  useVoiceStore: {
    getState: vi.fn(() => ({ setVoiceState: vi.fn() })),
  },
}))

// supabase globally mocked in setup.ts

// ── Mock SpeechRecognition ─────────────────────────────────────────────────────

class MockSpeechRecognition {
  continuous     = false
  interimResults = false
  lang           = ''
  onresult:      ((e: any) => void) | null = null
  onerror:       ((e: any) => void) | null = null
  onstart:       (() => void) | null = null
  onend:         (() => void) | null = null

  start  = vi.fn()
  stop   = vi.fn()
  abort  = vi.fn()

  static instances: MockSpeechRecognition[] = []
  static reset() { MockSpeechRecognition.instances = [] }

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }
}

// Install before importing the hook
Object.defineProperty(globalThis.window, 'SpeechRecognition', {
  value: MockSpeechRecognition,
  writable: true,
  configurable: true,
})
Object.defineProperty(globalThis.window, 'webkitSpeechRecognition', {
  value: undefined,
  writable: true,
  configurable: true,
})

import { useVoice } from './useVoice'

function getInstance() {
  return MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
}

describe('useVoice', () => {
  beforeEach(() => {
    MockSpeechRecognition.reset()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle state when SpeechRecognition is available', () => {
    const { result } = renderHook(() => useVoice())
    expect(result.current.state).toBe('idle')
    expect(result.current.transcript).toBe('')
    expect(result.current.response).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('starts in unsupported state when SpeechRecognition is not available', () => {
    // Temporarily remove SR
    const orig = (window as any).SpeechRecognition
    ;(window as any).SpeechRecognition = null
    ;(window as any).webkitSpeechRecognition = null

    const { result } = renderHook(() => useVoice())
    expect(result.current.state).toBe('unsupported')

    ;(window as any).SpeechRecognition = orig
  })

  it('starts recognition on mount', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    expect(sr.start).toHaveBeenCalled()
  })

  it('sets continuous and interimResults on the recognition instance', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    expect(sr.continuous).toBe(true)
    expect(sr.interimResults).toBe(true)
    expect(sr.lang).toBe('en-US')
  })

  it('stops recognition on unmount', () => {
    const { unmount } = renderHook(() => useVoice())
    const sr = getInstance()
    unmount()
    expect(sr.stop).toHaveBeenCalled()
  })

  it('transitions to listening state when wake word is spoken', () => {
    const { soundWakeWord } = require('../lib/sounds')
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Hey board', confidence: 0.9 }], { isFinal: true }),
        ],
      })
    })

    expect(result.current.state).toBe('listening')
    expect(soundWakeWord).toHaveBeenCalled()
  })

  it('stays idle when speech does not match wake word', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'random speech', confidence: 0.9 }], { isFinal: true }),
        ],
      })
    })

    expect(result.current.state).toBe('idle')
  })

  it('accumulates transcript while listening', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    // Trigger wake word
    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'Hey board', confidence: 0.9 }], { isFinal: true }),
        ],
      })
    })

    // Add more speech
    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'show me the weather', confidence: 0.9 }], { isFinal: true }),
        ],
      })
    })

    expect(result.current.transcript).toContain('weather')
  })

  it('handles not-allowed error by transitioning to unsupported', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    act(() => {
      sr.onerror?.({ error: 'not-allowed' })
    })

    expect(result.current.state).toBe('unsupported')
  })

  it('ignores no-speech and aborted errors', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    act(() => { sr.onerror?.({ error: 'no-speech' }) })
    expect(result.current.state).toBe('idle')

    act(() => { sr.onerror?.({ error: 'aborted' }) })
    expect(result.current.state).toBe('idle')
  })

  it('auto-restarts recognition when it ends in idle state', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    const startCallsBefore = sr.start.mock.calls.length

    act(() => {
      sr.onend?.()
      vi.advanceTimersByTime(400)
    })

    expect(sr.start.mock.calls.length).toBeGreaterThan(startCallsBefore)
  })

  it('exits conversation and returns to idle when exit phrase spoken while listening', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()

    // Wake word
    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: 'Hey board' }], { isFinal: true })],
      })
    })
    expect(result.current.state).toBe('listening')

    // Exit phrase
    act(() => {
      sr.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: 'thanks' }], { isFinal: true })],
      })
    })

    // After speak timeout
    act(() => { vi.advanceTimersByTime(1500) })
    expect(result.current.state).toBe('idle')
  })
})
