import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockBroadcast      = vi.fn()
const mockLoadTokens     = vi.fn()
const mockCompileBriefing = vi.fn()
const mockLog            = vi.fn()
const mockLogError       = vi.fn()

vi.mock('../ws.js', () => ({
  broadcast: (...args: any[]) => mockBroadcast(...args),
}))

vi.mock('../services/tokens.js', () => ({
  loadTokens: (...args: any[]) => mockLoadTokens(...args),
}))

vi.mock('../services/briefing.js', () => ({
  compileBriefing: (...args: any[]) => mockCompileBriefing(...args),
}))

vi.mock('../lib/logger.js', () => ({
  log:   (...args: any[]) => mockLog(...args),
  error: (...args: any[]) => mockLogError(...args),
}))

import { startBriefingCron } from './briefing.js'

// ── Helper to create a fake Notion client ──────────────────────────────────────
function makeNotion() { return {} as any }

describe('startBriefingCron()', () => {
  beforeEach(() => {
    // Pin fake clock to 07:59:00 — advancing 60s fires the interval at 08:00:00
    vi.useFakeTimers({ now: new Date('2024-01-15T07:59:00') })
    mockBroadcast.mockReset()
    mockLoadTokens.mockReset()
    mockCompileBriefing.mockReset()
    mockLog.mockReset()
    mockLogError.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not broadcast when no tokens are configured', async () => {
    mockLoadTokens.mockReturnValue(null)
    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('does not broadcast when briefing_time is not set in tokens', async () => {
    mockLoadTokens.mockReturnValue({ some_key: 'value' })
    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('does not broadcast when current time does not match briefing_time', async () => {
    // Fake clock fires at 08:00 — use a different time so it won't match
    mockLoadTokens.mockReturnValue({ briefing_time: '09:00' })
    mockCompileBriefing.mockResolvedValue('Good morning!')

    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('broadcasts speak_briefing when time matches', async () => {
    // Fake clock is pinned to 07:59; after advancing 60s the interval fires at 08:00
    mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })
    mockCompileBriefing.mockResolvedValue('Good morning! You have 3 events today.')

    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)

    expect(mockCompileBriefing).toHaveBeenCalled()
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'speak_briefing',
        text: 'Good morning! You have 3 events today.',
      })
    )
  })

  it('includes a unique id in the speak_briefing broadcast', async () => {
    mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })
    mockCompileBriefing.mockResolvedValue('Morning!')

    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)

    const call = mockBroadcast.mock.calls[0][0]
    expect(typeof call.id).toBe('string')
    expect(call.id.length).toBeGreaterThan(0)
  })

  it('logs an error and does not crash when compileBriefing throws', async () => {
    mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })
    mockCompileBriefing.mockRejectedValue(new Error('API error'))

    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)

    expect(mockLogError).toHaveBeenCalled()
    expect(mockBroadcast).not.toHaveBeenCalled()
  })

  it('polls on the next 60s tick', async () => {
    mockLoadTokens.mockReturnValue(null)
    startBriefingCron(makeNotion())
    await vi.advanceTimersByTimeAsync(60_000)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockLoadTokens).toHaveBeenCalledTimes(2)
  })

  it('passes the notion client to compileBriefing', async () => {
    mockLoadTokens.mockReturnValue({ briefing_time: '08:00' })
    mockCompileBriefing.mockResolvedValue('Brief.')

    const notion = makeNotion()
    startBriefingCron(notion)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(mockCompileBriefing).toHaveBeenCalledWith(notion)
  })
})
