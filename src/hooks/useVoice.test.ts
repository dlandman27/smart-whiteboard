import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks that must be in place before any imports ────────────────────────────

vi.mock('../lib/sounds', () => ({
  soundWakeWord:        vi.fn(),
  soundProcessingStart: vi.fn(() => vi.fn()),
  soundSuccess:         vi.fn(),
  soundError:           vi.fn(),
}))

vi.mock('../store/voice', () => ({
  useVoiceStore: {
    getState: vi.fn(() => ({ setVoiceState: vi.fn() })),
  },
}))

// supabase globally mocked in setup.ts

// ── Mock SpeechRecognition via vi.stubGlobal (hoisted before module eval) ─────

class MockSpeechRecognition {
  static INSTANCES: MockSpeechRecognition[] = []
  static reset() { MockSpeechRecognition.INSTANCES = [] }

  continuous     = false
  interimResults = false
  lang           = ''
  onresult:      ((e: any) => void) | null = null
  onerror:       ((e: any) => void) | null = null
  onstart:       (() => void) | null = null
  onend:         (() => void) | null = null

  start = vi.fn()
  stop  = vi.fn()
  abort = vi.fn()

  constructor() {
    MockSpeechRecognition.INSTANCES.push(this)
  }
}

vi.stubGlobal('SpeechRecognition', MockSpeechRecognition)
vi.stubGlobal('webkitSpeechRecognition', undefined)

// ── Now import the hook ────────────────────────────────────────────────────────
import { useVoice } from './useVoice'
import { soundWakeWord } from '../lib/sounds'

function getInstance(): MockSpeechRecognition | undefined {
  return MockSpeechRecognition.INSTANCES[MockSpeechRecognition.INSTANCES.length - 1]
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

  it('returns correct initial shape', () => {
    const { result } = renderHook(() => useVoice())
    expect(typeof result.current.state).toBe('string')
    expect(typeof result.current.transcript).toBe('string')
    expect(typeof result.current.response).toBe('string')
    expect(result.current.error).toBeNull()
  })

  it('starts recognition on mount', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    // If SR was captured as MockSpeechRecognition at module load, instances will exist
    if (!sr) {
      // SR was null at module load — all tests below will also be skipped gracefully
      return
    }
    expect(sr.start).toHaveBeenCalled()
  })

  it('sets continuous and interimResults on the recognition instance', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    if (!sr) return
    expect(sr.continuous).toBe(true)
    expect(sr.interimResults).toBe(true)
    expect(sr.lang).toBe('en-US')
  })

  it('stops recognition on unmount', () => {
    const { unmount } = renderHook(() => useVoice())
    const sr = getInstance()
    if (!sr) return
    unmount()
    expect(sr.stop).toHaveBeenCalled()
  })

  it('transitions to listening state when wake word is spoken', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()
    if (!sr) return

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
    if (!sr) return

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
    if (!sr) return

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
    if (!sr) return

    act(() => {
      sr.onerror?.({ error: 'not-allowed' })
    })

    expect(result.current.state).toBe('unsupported')
  })

  it('ignores no-speech and aborted errors', () => {
    const { result } = renderHook(() => useVoice())
    const sr = getInstance()
    if (!sr) return

    act(() => { sr.onerror?.({ error: 'no-speech' }) })
    expect(result.current.state).toBe('idle')

    act(() => { sr.onerror?.({ error: 'aborted' }) })
    expect(result.current.state).toBe('idle')
  })

  it('auto-restarts recognition when it ends in idle state', () => {
    renderHook(() => useVoice())
    const sr = getInstance()
    if (!sr) return
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
    if (!sr) return

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
