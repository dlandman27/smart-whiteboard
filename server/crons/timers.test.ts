import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockBroadcast   = vi.fn()
const mockLoggedNotify = vi.fn()

vi.mock('../ws.js', () => ({
  broadcast: (...args: any[]) => mockBroadcast(...args),
}))

vi.mock('../services/notify.js', () => ({
  loggedNotify: (...args: any[]) => mockLoggedNotify(...args),
}))

vi.mock('../services/timers.js', () => ({
  activeTimers: new Map(),
}))

import { activeTimers } from '../services/timers.js'
import { startTimerCron } from './timers.js'

describe('startTimerCron()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    activeTimers.clear()
    mockBroadcast.mockReset()
    mockLoggedNotify.mockReset()
  })

  afterEach(() => {
    activeTimers.clear()
    vi.useRealTimers()
  })

  it('does not fire when no timers exist', () => {
    startTimerCron()
    vi.advanceTimersByTime(5_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('fires when a timer duration has elapsed', () => {
    activeTimers.set('t1', {
      id:         't1',
      label:      'Pizza',
      durationMs: 4_000,
      startedAt:  Date.now() - 5_000,  // started 5s ago, duration 4s → expired
      fired:      false,
    })
    startTimerCron()
    vi.advanceTimersByTime(5_000)

    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'speak_briefing', text: 'Pizza is done.' })
    )
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'timer_alert', timerId: 't1', label: 'Pizza' })
    )
    expect(mockLoggedNotify).toHaveBeenCalledWith(
      '⏰ Timer done',
      'Pizza',
      expect.objectContaining({ priority: 'high' })
    )
  })

  it('marks timer as fired after triggering', () => {
    activeTimers.set('t2', {
      id: 't2', label: 'Eggs', durationMs: 1_000, startedAt: Date.now() - 2_000, fired: false,
    })
    startTimerCron()
    vi.advanceTimersByTime(5_000)
    expect(activeTimers.get('t2')!.fired).toBe(true)
  })

  it('does not fire a timer that is already fired', () => {
    activeTimers.set('t3', {
      id: 't3', label: 'Old', durationMs: 1_000, startedAt: Date.now() - 10_000, fired: true,
    })
    startTimerCron()
    vi.advanceTimersByTime(5_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('does not fire a timer that has not elapsed yet', () => {
    activeTimers.set('t4', {
      id: 't4', label: 'Future', durationMs: 60_000, startedAt: Date.now(), fired: false,
    })
    startTimerCron()
    vi.advanceTimersByTime(5_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('fires multiple timers in one tick', () => {
    const now = Date.now()
    activeTimers.set('ta', { id: 'ta', label: 'A', durationMs: 1_000, startedAt: now - 2_000, fired: false })
    activeTimers.set('tb', { id: 'tb', label: 'B', durationMs: 1_000, startedAt: now - 2_000, fired: false })
    startTimerCron()
    vi.advanceTimersByTime(5_000)
    const speakCalls = mockBroadcast.mock.calls.filter(c => c[0].type === 'speak_briefing')
    expect(speakCalls).toHaveLength(2)
  })

  it('schedules timer deletion after 5 minutes', () => {
    activeTimers.set('t5', {
      id: 't5', label: 'Soup', durationMs: 1_000, startedAt: Date.now() - 2_000, fired: false,
    })
    startTimerCron()
    vi.advanceTimersByTime(5_000) // triggers the timer
    expect(activeTimers.has('t5')).toBe(true) // still present (will be deleted after 5min)
    vi.advanceTimersByTime(5 * 60_000) // 5 minutes pass
    expect(activeTimers.has('t5')).toBe(false)
  })
})
