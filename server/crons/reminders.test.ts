import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockBroadcast    = vi.fn()
const mockLoggedNotify = vi.fn()
const mockLoadReminders = vi.fn()
const mockSaveReminders = vi.fn()

vi.mock('../ws.js', () => ({
  broadcast: (...args: any[]) => mockBroadcast(...args),
}))

vi.mock('../services/notify.js', () => ({
  loggedNotify: (...args: any[]) => mockLoggedNotify(...args),
}))

vi.mock('../services/reminders.js', () => ({
  loadReminders: (...args: any[]) => mockLoadReminders(...args),
  saveReminders: (...args: any[]) => mockSaveReminders(...args),
}))

import { startReminderCron } from './reminders.js'

function pastISO(offsetMs: number) {
  return new Date(Date.now() - offsetMs).toISOString()
}

function futureISO(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString()
}

describe('startReminderCron()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockBroadcast.mockReset()
    mockLoggedNotify.mockReset()
    mockLoadReminders.mockReset()
    mockSaveReminders.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call notify when no reminders are due', () => {
    mockLoadReminders.mockReturnValue([
      { id: 'r1', text: 'Future reminder', fireAt: futureISO(60_000), fired: false },
    ])
    startReminderCron()
    vi.advanceTimersByTime(60_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
    expect(mockLoggedNotify).not.toHaveBeenCalled()
  })

  it('fires a past-due reminder', () => {
    mockLoadReminders.mockReturnValue([
      { id: 'r2', text: 'Call dentist', fireAt: pastISO(5_000), fired: false },
    ])
    startReminderCron()
    vi.advanceTimersByTime(60_000)

    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'speak_briefing', text: 'Reminder: Call dentist' })
    )
    expect(mockLoggedNotify).toHaveBeenCalledWith(
      '🔔 Reminder',
      'Call dentist',
      expect.objectContaining({ priority: 'high', tags: ['reminder'] })
    )
  })

  it('marks reminder as fired and saves', () => {
    const reminder = { id: 'r3', text: 'Pick up kids', fireAt: pastISO(1_000), fired: false }
    mockLoadReminders.mockReturnValue([reminder])
    startReminderCron()
    vi.advanceTimersByTime(60_000)

    expect(mockSaveReminders).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'r3', fired: true })])
    )
  })

  it('skips already-fired reminders', () => {
    mockLoadReminders.mockReturnValue([
      { id: 'r4', text: 'Old reminder', fireAt: pastISO(10_000), fired: true },
    ])
    startReminderCron()
    vi.advanceTimersByTime(60_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('does not call saveReminders when nothing changed', () => {
    mockLoadReminders.mockReturnValue([
      { id: 'r5', text: 'Future', fireAt: futureISO(3_600_000), fired: false },
    ])
    startReminderCron()
    vi.advanceTimersByTime(60_000)
    expect(mockSaveReminders).not.toHaveBeenCalled()
  })

  it('fires multiple due reminders in one tick', () => {
    mockLoadReminders.mockReturnValue([
      { id: 'ra', text: 'First',  fireAt: pastISO(2_000), fired: false },
      { id: 'rb', text: 'Second', fireAt: pastISO(1_000), fired: false },
    ])
    startReminderCron()
    vi.advanceTimersByTime(60_000)

    const speakCalls = mockBroadcast.mock.calls.filter(c => c[0].type === 'speak_briefing')
    expect(speakCalls).toHaveLength(2)
    expect(mockLoggedNotify).toHaveBeenCalledTimes(2)
    expect(mockSaveReminders).toHaveBeenCalledTimes(1) // single save for both
  })

  it('polls again on the next 60s tick', () => {
    mockLoadReminders.mockReturnValue([])
    startReminderCron()
    vi.advanceTimersByTime(60_000)
    vi.advanceTimersByTime(60_000)
    expect(mockLoadReminders).toHaveBeenCalledTimes(2)
  })
})
