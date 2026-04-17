import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Reminders mock ────────────────────────────────────────────────────────────
const mockLoadReminders = vi.fn()
const mockSaveReminders = vi.fn()
vi.mock('../reminders.js', () => ({
  loadReminders: () => mockLoadReminders(),
  saveReminders: (...args: any[]) => mockSaveReminders(...args),
}))

// ── activeTimers mock  ────────────────────────────────────────────────────────
// We need a real Map so we can inspect it between tests
import { activeTimers } from '../timers.js'

import { timerTools } from './timers.js'

const fakeCtx = { notion: {} as any, gcal: null, userId: 'uid' }

function getTool(name: string) {
  const t = timerTools.find((t) => t.definition.name === name)
  if (!t) throw new Error(`Tool ${name} not found`)
  return t
}

describe('timer tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeTimers.clear()
    mockLoadReminders.mockReturnValue([])
  })

  // ── set_timer ─────────────────────────────────────────────────────────────

  describe('set_timer', () => {
    it('creates a timer and returns confirmation', async () => {
      const tool   = getTool('set_timer')
      const result = await tool.execute({ durationSeconds: 600 }, fakeCtx)

      expect(result).toMatch(/Timer set for 10 minutes/)
      expect(activeTimers.size).toBe(1)

      const [timer] = activeTimers.values()
      expect(timer.durationMs).toBe(600_000)
      expect(timer.fired).toBe(false)
    })

    it('includes label in confirmation when provided', async () => {
      const tool   = getTool('set_timer')
      const result = await tool.execute({ durationSeconds: 300, label: 'pasta' }, fakeCtx)

      expect(result).toContain('pasta')
      expect(result).toMatch(/5 minutes/)
    })

    it('handles sub-minute duration (seconds only)', async () => {
      const tool   = getTool('set_timer')
      const result = await tool.execute({ durationSeconds: 45 }, fakeCtx)

      expect(result).toContain('45 seconds')
    })

    it('handles mixed minutes and seconds', async () => {
      const tool   = getTool('set_timer')
      const result = await tool.execute({ durationSeconds: 90 }, fakeCtx)

      expect(result).toContain('1 minute')
      expect(result).toContain('30 seconds')
    })

    it('uses duration as label when no label provided', async () => {
      const tool = getTool('set_timer')
      await tool.execute({ durationSeconds: 120 }, fakeCtx)

      const [timer] = activeTimers.values()
      expect(timer.label).toContain('minute')
    })

    it('returns id in result', async () => {
      const tool   = getTool('set_timer')
      const result = await tool.execute({ durationSeconds: 60 }, fakeCtx)
      expect(result).toMatch(/id: [\w-]+/)
    })
  })

  // ── list_timers ───────────────────────────────────────────────────────────

  describe('list_timers', () => {
    it('returns no active timers message when none set', async () => {
      const tool   = getTool('list_timers')
      const result = await tool.execute({}, fakeCtx)
      expect(result).toBe('No active timers.')
    })

    it('lists active timers with remaining time', async () => {
      activeTimers.set('t1', {
        id:         't1',
        label:      'pasta',
        durationMs: 600_000,
        startedAt:  Date.now() - 60_000, // started 1 minute ago
        fired:      false,
      })

      const tool   = getTool('list_timers')
      const result = await tool.execute({}, fakeCtx)

      expect(result).toContain('pasta')
      expect(result).toContain('t1')
      // 9 minutes left approximately
      expect(result).toMatch(/\d+m \d+s left/)
    })

    it('does not list fired timers', async () => {
      activeTimers.set('fired-t', {
        id:         'fired-t',
        label:      'done',
        durationMs: 60_000,
        startedAt:  Date.now() - 120_000,
        fired:      true,
      })
      activeTimers.set('active-t', {
        id:         'active-t',
        label:      'running',
        durationMs: 300_000,
        startedAt:  Date.now(),
        fired:      false,
      })

      const tool   = getTool('list_timers')
      const result = await tool.execute({}, fakeCtx)

      expect(result).not.toContain('done')
      expect(result).toContain('running')
    })
  })

  // ── cancel_timer ──────────────────────────────────────────────────────────

  describe('cancel_timer', () => {
    it('cancels an active timer', async () => {
      activeTimers.set('t1', {
        id:         't1',
        label:      'laundry',
        durationMs: 1_800_000,
        startedAt:  Date.now(),
        fired:      false,
      })

      const tool   = getTool('cancel_timer')
      const result = await tool.execute({ timerId: 't1' }, fakeCtx)

      expect(result).toContain('laundry')
      expect(activeTimers.has('t1')).toBe(false)
    })

    it('returns error when timer not found', async () => {
      const tool   = getTool('cancel_timer')
      const result = await tool.execute({ timerId: 'nonexistent' }, fakeCtx)

      expect(result).toMatch(/No timer found/)
      expect(result).toContain('nonexistent')
    })
  })

  // ── set_reminder ──────────────────────────────────────────────────────────

  describe('set_reminder', () => {
    it('creates a reminder and returns confirmation', async () => {
      const reminders: any[] = []
      mockLoadReminders.mockReturnValue(reminders)
      mockSaveReminders.mockImplementation((r: any[]) => reminders.push(...r))

      const tool   = getTool('set_reminder')
      const result = await tool.execute({
        text:   'Call mom',
        fireAt: '2026-04-18T15:00:00',
      }, fakeCtx)

      expect(result).toContain('Call mom')
      expect(result).toMatch(/id: [\w-]+/)
      expect(mockSaveReminders).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call mom', fireAt: '2026-04-18T15:00:00', fired: false }),
        ]),
      )
    })

    it('appends to existing reminders', async () => {
      const existing = [{ id: 'r0', text: 'existing', fireAt: '2026-04-18T09:00:00', fired: false }]
      mockLoadReminders.mockReturnValue(existing)

      const tool = getTool('set_reminder')
      await tool.execute({ text: 'New reminder', fireAt: '2026-04-19T10:00:00' }, fakeCtx)

      const saved = mockSaveReminders.mock.calls[0][0]
      expect(saved).toHaveLength(2)
      expect(saved[0].text).toBe('existing')
      expect(saved[1].text).toBe('New reminder')
    })
  })

  // ── list_reminders ────────────────────────────────────────────────────────

  describe('list_reminders', () => {
    it('returns no reminders message when empty', async () => {
      mockLoadReminders.mockReturnValue([])

      const tool   = getTool('list_reminders')
      const result = await tool.execute({}, fakeCtx)
      expect(result).toBe('No upcoming reminders.')
    })

    it('lists only un-fired reminders', async () => {
      mockLoadReminders.mockReturnValue([
        { id: 'r1', text: 'Call mom',  fireAt: '2026-04-18T15:00:00', fired: false },
        { id: 'r2', text: 'Old thing', fireAt: '2026-04-01T09:00:00', fired: true  },
      ])

      const tool   = getTool('list_reminders')
      const result = await tool.execute({}, fakeCtx)

      expect(result).toContain('Call mom')
      expect(result).not.toContain('Old thing')
    })

    it('includes reminder id in output', async () => {
      mockLoadReminders.mockReturnValue([
        { id: 'rem-123', text: 'Gym', fireAt: '2026-04-18T07:00:00', fired: false },
      ])

      const tool   = getTool('list_reminders')
      const result = await tool.execute({}, fakeCtx)

      expect(result).toContain('rem-123')
    })
  })

  // ── cancel_reminder ───────────────────────────────────────────────────────

  describe('cancel_reminder', () => {
    it('cancels a reminder by id', async () => {
      const reminders = [
        { id: 'r1', text: 'Doctor appointment', fireAt: '2026-04-20T10:00:00', fired: false },
        { id: 'r2', text: 'Pick up kids',        fireAt: '2026-04-21T15:00:00', fired: false },
      ]
      mockLoadReminders.mockReturnValue([...reminders])

      const tool   = getTool('cancel_reminder')
      const result = await tool.execute({ reminderId: 'r1' }, fakeCtx)

      expect(result).toContain('Doctor appointment')
      const saved = mockSaveReminders.mock.calls[0][0]
      expect(saved).toHaveLength(1)
      expect(saved[0].id).toBe('r2')
    })

    it('returns error when reminder not found', async () => {
      mockLoadReminders.mockReturnValue([])

      const tool   = getTool('cancel_reminder')
      const result = await tool.execute({ reminderId: 'nope' }, fakeCtx)

      expect(result).toMatch(/No reminder found/)
      expect(mockSaveReminders).not.toHaveBeenCalled()
    })
  })
})
