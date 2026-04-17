import { describe, it, expect, beforeEach } from 'vitest'
import { useVoiceStore } from './voice'
import type { VoiceState } from '../hooks/useVoice'

const store = () => useVoiceStore.getState()

beforeEach(() => {
  useVoiceStore.setState(useVoiceStore.getInitialState(), true)
})

describe('useVoiceStore — initial state', () => {
  it('starts with state "idle"', () => {
    expect(store().state).toBe('idle')
  })
})

describe('setVoiceState', () => {
  it('transitions to "listening"', () => {
    store().setVoiceState('listening')
    expect(store().state).toBe('listening')
  })

  it('transitions to "processing"', () => {
    store().setVoiceState('processing')
    expect(store().state).toBe('processing')
  })

  it('transitions to "responding"', () => {
    store().setVoiceState('responding')
    expect(store().state).toBe('responding')
  })

  it('transitions to "unsupported"', () => {
    store().setVoiceState('unsupported')
    expect(store().state).toBe('unsupported')
  })

  it('transitions back to "idle"', () => {
    store().setVoiceState('listening')
    store().setVoiceState('idle')
    expect(store().state).toBe('idle')
  })

  it('setting the same state is idempotent', () => {
    store().setVoiceState('processing')
    store().setVoiceState('processing')
    expect(store().state).toBe('processing')
  })

  it('can cycle through all states', () => {
    const states: VoiceState[] = ['listening', 'processing', 'responding', 'idle', 'unsupported']
    for (const s of states) {
      store().setVoiceState(s)
      expect(store().state).toBe(s)
    }
  })
})
