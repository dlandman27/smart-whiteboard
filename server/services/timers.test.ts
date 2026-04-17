import { describe, it, expect, beforeEach } from 'vitest'
import { activeTimers, type TimerEntry } from './timers.js'

beforeEach(() => {
  activeTimers.clear()
})

describe('activeTimers', () => {
  it('is initially empty', () => {
    expect(activeTimers.size).toBe(0)
  })

  it('can add a timer entry', () => {
    const entry: TimerEntry = {
      id: 't1',
      label: 'Pizza timer',
      durationMs: 600000,
      startedAt: Date.now(),
      fired: false,
    }
    activeTimers.set(entry.id, entry)
    expect(activeTimers.size).toBe(1)
    expect(activeTimers.has('t1')).toBe(true)
  })

  it('can retrieve a timer entry by id', () => {
    const now = Date.now()
    const entry: TimerEntry = {
      id: 't1',
      label: 'Pasta',
      durationMs: 300000,
      startedAt: now,
      fired: false,
    }
    activeTimers.set('t1', entry)
    const retrieved = activeTimers.get('t1')
    expect(retrieved).toBeDefined()
    expect(retrieved!.label).toBe('Pasta')
    expect(retrieved!.durationMs).toBe(300000)
    expect(retrieved!.startedAt).toBe(now)
    expect(retrieved!.fired).toBe(false)
  })

  it('can update a timer entry (mark as fired)', () => {
    const entry: TimerEntry = {
      id: 't1',
      label: 'Alarm',
      durationMs: 60000,
      startedAt: Date.now(),
      fired: false,
    }
    activeTimers.set('t1', entry)
    activeTimers.set('t1', { ...entry, fired: true })
    expect(activeTimers.get('t1')!.fired).toBe(true)
  })

  it('can delete a timer entry', () => {
    activeTimers.set('t1', { id: 't1', label: 'Test', durationMs: 1000, startedAt: Date.now(), fired: false })
    activeTimers.delete('t1')
    expect(activeTimers.has('t1')).toBe(false)
    expect(activeTimers.size).toBe(0)
  })

  it('can store multiple timers', () => {
    activeTimers.set('t1', { id: 't1', label: 'Timer 1', durationMs: 1000, startedAt: Date.now(), fired: false })
    activeTimers.set('t2', { id: 't2', label: 'Timer 2', durationMs: 2000, startedAt: Date.now(), fired: false })
    activeTimers.set('t3', { id: 't3', label: 'Timer 3', durationMs: 3000, startedAt: Date.now(), fired: true })
    expect(activeTimers.size).toBe(3)
  })

  it('iterating over entries returns all timers', () => {
    activeTimers.set('t1', { id: 't1', label: 'A', durationMs: 1000, startedAt: 0, fired: false })
    activeTimers.set('t2', { id: 't2', label: 'B', durationMs: 2000, startedAt: 0, fired: false })
    const ids = [...activeTimers.keys()]
    expect(ids).toContain('t1')
    expect(ids).toContain('t2')
  })

  it('can filter fired timers', () => {
    activeTimers.set('t1', { id: 't1', label: 'Fired', durationMs: 1000, startedAt: 0, fired: true })
    activeTimers.set('t2', { id: 't2', label: 'Active', durationMs: 2000, startedAt: 0, fired: false })
    const pending = [...activeTimers.values()].filter((t) => !t.fired)
    expect(pending).toHaveLength(1)
    expect(pending[0].label).toBe('Active')
  })

  it('can compute elapsed time for a timer', () => {
    const startedAt = Date.now() - 5000
    const entry: TimerEntry = {
      id: 't1', label: 'Test', durationMs: 10000, startedAt, fired: false,
    }
    activeTimers.set('t1', entry)
    const elapsed = Date.now() - activeTimers.get('t1')!.startedAt
    expect(elapsed).toBeGreaterThanOrEqual(5000)
    expect(elapsed).toBeLessThan(10000)
  })

  it('can check if a timer has expired', () => {
    const startedAt = Date.now() - 15000
    const entry: TimerEntry = {
      id: 't1', label: 'Expired', durationMs: 10000, startedAt, fired: false,
    }
    activeTimers.set('t1', entry)
    const t = activeTimers.get('t1')!
    const hasExpired = Date.now() - t.startedAt >= t.durationMs
    expect(hasExpired).toBe(true)
  })

  it('cleared map has size zero', () => {
    activeTimers.set('t1', { id: 't1', label: 'X', durationMs: 1000, startedAt: 0, fired: false })
    activeTimers.clear()
    expect(activeTimers.size).toBe(0)
  })
})
