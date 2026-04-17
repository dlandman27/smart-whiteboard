import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock googleapis ────────────────────────────────────────────────────────────

const mockEventsList = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn(() => ({
      events: { list: mockEventsList },
    })),
  },
}))

import { calendarAgent } from './calendarAgent.js'
import type { AgentContext } from '../types.js'

function makeCtx(gcal: any = {}, overrides?: Partial<AgentContext>): AgentContext {
  return {
    broadcast:     vi.fn(),
    speak:         vi.fn(),
    notify:        vi.fn().mockResolvedValue(undefined),
    notion:        {} as any,
    anthropic:     {} as any,
    gcal,
    boards:        [],
    activeBoardId: 'board-1',
    ...overrides,
  }
}

function makeGCalEvent(overrides: any = {}) {
  const soon = new Date(Date.now() + 5 * 60_000).toISOString()
  return {
    id:      'event-1',
    summary: 'Team Meeting',
    start:   { dateTime: soon },
    ...overrides,
  }
}

describe('calendarAgent metadata', () => {
  it('has correct id, name, icon, intervalMs', () => {
    expect(calendarAgent.id).toBe('calendar-agent')
    expect(calendarAgent.name).toBe('Calendar Agent')
    expect(calendarAgent.icon).toBe('📅')
    expect(calendarAgent.intervalMs).toBe(5 * 60_000)
    expect(calendarAgent.enabled).toBe(true)
  })
})

describe('calendarAgent.run()', () => {
  beforeEach(() => {
    mockEventsList.mockReset()
    vi.clearAllMocks()
  })

  it('returns early when gcal is null', async () => {
    const ctx = makeCtx(null)
    await calendarAgent.run(ctx)
    expect(mockEventsList).not.toHaveBeenCalled()
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('returns early when events.list throws', async () => {
    mockEventsList.mockRejectedValue(new Error('Auth expired'))
    const ctx = makeCtx({})
    await expect(calendarAgent.run(ctx)).resolves.toBeUndefined()
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('does not alert when there are no events', async () => {
    mockEventsList.mockResolvedValue({ data: { items: [] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.speak).not.toHaveBeenCalled()
    expect(ctx.notify).not.toHaveBeenCalled()
  })

  it('calls ctx.speak for an event starting soon', async () => {
    mockEventsList.mockResolvedValue({ data: { items: [makeGCalEvent()] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.speak).toHaveBeenCalledWith(
      expect.stringContaining('Team Meeting')
    )
  })

  it('calls ctx.broadcast with agent_notification for an event starting soon', async () => {
    mockEventsList.mockResolvedValue({ data: { items: [makeGCalEvent()] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'agent_notification', body: 'Team Meeting' })
    )
  })

  it('calls ctx.notify with high priority', async () => {
    mockEventsList.mockResolvedValue({ data: { items: [makeGCalEvent()] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.notify).toHaveBeenCalledWith(
      expect.stringContaining('Team Meeting'),
      expect.any(String),
      expect.objectContaining({ priority: 'high', tags: ['calendar'] })
    )
  })

  it('skips an event that has already been alerted (dedup)', async () => {
    const event = makeGCalEvent({ id: 'dedup-event' })
    mockEventsList.mockResolvedValue({ data: { items: [event] } })
    const ctx = makeCtx({})

    // First run — should alert
    await calendarAgent.run(ctx)
    const speakCallCount = (ctx.speak as any).mock.calls.length

    // Second run with same event
    await calendarAgent.run(ctx)
    // Should not have been called again
    expect((ctx.speak as any).mock.calls.length).toBe(speakCallCount)
  })

  it('uses "starting now" for events within 1 minute', async () => {
    const event = makeGCalEvent({ start: { dateTime: new Date(Date.now() + 30_000).toISOString() } })
    mockEventsList.mockResolvedValue({ data: { items: [event] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.speak).toHaveBeenCalledWith(expect.stringContaining('starting now'))
  })

  it('skips events without a start time', async () => {
    const event = { id: 'no-start', summary: 'Vague Event', start: {} }
    mockEventsList.mockResolvedValue({ data: { items: [event] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('handles null items from events.list', async () => {
    mockEventsList.mockResolvedValue({ data: {} })
    const ctx = makeCtx({})
    await expect(calendarAgent.run(ctx)).resolves.toBeUndefined()
    expect(ctx.speak).not.toHaveBeenCalled()
  })

  it('uses "an event" as fallback title when summary is missing', async () => {
    const event = makeGCalEvent({ summary: undefined })
    mockEventsList.mockResolvedValue({ data: { items: [event] } })
    const ctx = makeCtx({})
    await calendarAgent.run(ctx)
    expect(ctx.speak).toHaveBeenCalledWith(expect.stringContaining('an event'))
  })
})
