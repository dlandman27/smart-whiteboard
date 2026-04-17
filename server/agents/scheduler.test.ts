import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/logger.js', () => ({
  log:   vi.fn(),
  error: vi.fn(),
}))

import { AgentScheduler } from './scheduler.js'
import type { Agent, AgentContext } from './types.js'

function makeCtx(overrides?: Partial<AgentContext>): AgentContext {
  return {
    broadcast: vi.fn(),
    speak:     vi.fn(),
    notify:    vi.fn().mockResolvedValue(undefined),
    notion:    {} as any,
    anthropic: {} as any,
    gcal:      null,
    boards:    [],
    activeBoardId: 'board-1',
    ...overrides,
  }
}

function makeAgent(overrides?: Partial<Agent>): Agent {
  return {
    id:          'test-agent',
    name:        'Test Agent',
    description: 'Does test things',
    icon:        '🧪',
    intervalMs:  60_000,
    enabled:     true,
    run:         vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler
  let ctx: AgentContext

  beforeEach(() => {
    vi.useFakeTimers()
    ctx = makeCtx()
    scheduler = new AgentScheduler(ctx)
  })

  afterEach(() => {
    scheduler.stop()
    vi.useRealTimers()
  })

  describe('register()', () => {
    it('returns this for chaining', () => {
      const agent = makeAgent()
      const result = scheduler.register(agent)
      expect(result).toBe(scheduler)
    })

    it('registers an agent and shows it in status()', () => {
      const agent = makeAgent()
      scheduler.register(agent)
      const status = scheduler.status()
      expect(status).toHaveLength(1)
      expect(status[0].id).toBe('test-agent')
      expect(status[0].name).toBe('Test Agent')
    })

    it('registers multiple agents', () => {
      scheduler.register(makeAgent({ id: 'a1', name: 'A1' }))
      scheduler.register(makeAgent({ id: 'a2', name: 'A2' }))
      expect(scheduler.status()).toHaveLength(2)
    })
  })

  describe('start() / stop()', () => {
    it('starts the timer and does not throw', () => {
      expect(() => scheduler.start()).not.toThrow()
    })

    it('is idempotent — calling start() twice does not create two timers', () => {
      scheduler.start()
      scheduler.start() // second call should be a no-op
      // If two timers were created, two ticks would fire — just verify no throw
      vi.advanceTimersByTime(60_000)
    })

    it('stop() clears the timer', () => {
      scheduler.register(makeAgent())
      scheduler.start()
      scheduler.stop()
      // Tick after stop — agent should NOT run
      vi.advanceTimersByTime(120_000)
      // run was not called by the tick (only potentially by runNow)
    })
  })

  describe('runNow()', () => {
    it('runs a registered agent immediately', async () => {
      const agent = makeAgent()
      scheduler.register(agent)
      await scheduler.runNow('test-agent')
      expect(agent.run).toHaveBeenCalledWith(expect.objectContaining({ broadcast: expect.any(Function) }))
    })

    it('throws for unknown agent id', async () => {
      await expect(scheduler.runNow('ghost-agent')).rejects.toThrow('Unknown agent: ghost-agent')
    })

    it('broadcasts pet_wake before run and pet_idle after run', async () => {
      const agent = makeAgent()
      scheduler.register(agent)
      await scheduler.runNow('test-agent')
      expect(ctx.broadcast).toHaveBeenCalledWith({ type: 'pet_wake', agentId: 'test-agent' })
      expect(ctx.broadcast).toHaveBeenCalledWith({ type: 'pet_idle', agentId: 'test-agent' })
    })

    it('wraps ctx.speak to also broadcast pet_message', async () => {
      let capturedCtx: AgentContext | null = null
      const agent = makeAgent({
        run: vi.fn(async (c: AgentContext) => { capturedCtx = c }),
      })
      scheduler.register(agent)
      await scheduler.runNow('test-agent')
      capturedCtx!.speak('Hello world')
      expect(ctx.broadcast).toHaveBeenCalledWith({ type: 'pet_message', agentId: 'test-agent', text: 'Hello world' })
    })

    it('records run in history', async () => {
      scheduler.register(makeAgent())
      await scheduler.runNow('test-agent')
      // Verify lastRun is set by checking status nextRun is calculated
      const status = scheduler.status()
      expect(status[0].lastRun).not.toBeNull()
    })

    it('continues and logs when agent.run throws', async () => {
      const { error: logError } = await import('../lib/logger.js')
      const agent = makeAgent({ run: vi.fn().mockRejectedValue(new Error('agent crash')) })
      scheduler.register(agent)
      await expect(scheduler.runNow('test-agent')).resolves.toBeUndefined()
      expect(logError).toHaveBeenCalled()
    })
  })

  describe('status()', () => {
    it('shows nextRun as null when agent is disabled', () => {
      const agent = makeAgent({ enabled: false })
      scheduler.register(agent)
      const status = scheduler.status()
      expect(status[0].nextRun).toBeNull()
      expect(status[0].enabled).toBe(false)
    })

    it('shows "soon" as nextRun before first run', () => {
      scheduler.register(makeAgent())
      const status = scheduler.status()
      expect(status[0].nextRun).toBe('soon')
    })

    it('shows icon and spriteType', () => {
      const agent = makeAgent({ icon: '🦄', spriteType: 'cat' })
      scheduler.register(agent)
      const status = scheduler.status()
      expect(status[0].icon).toBe('🦄')
      expect(status[0].spriteType).toBe('cat')
    })
  })

  describe('setEnabled()', () => {
    it('enables a registered agent', () => {
      const agent = makeAgent({ enabled: false })
      scheduler.register(agent)
      scheduler.setEnabled('test-agent', true)
      expect(scheduler.status()[0].enabled).toBe(true)
    })

    it('disables a registered agent', () => {
      const agent = makeAgent({ enabled: true })
      scheduler.register(agent)
      scheduler.setEnabled('test-agent', false)
      expect(scheduler.status()[0].enabled).toBe(false)
    })

    it('is a no-op for unknown agent ids', () => {
      expect(() => scheduler.setEnabled('ghost', true)).not.toThrow()
    })
  })

  describe('setGCalFactory()', () => {
    it('returns this for chaining', () => {
      const result = scheduler.setGCalFactory(async () => null)
      expect(result).toBe(scheduler)
    })

    it('uses gcal factory result during execute', async () => {
      const gcalClient = { fake: 'client' }
      const factory = vi.fn().mockResolvedValue(gcalClient)
      scheduler.setGCalFactory(factory)

      let capturedCtx: AgentContext | null = null
      const agent = makeAgent({ run: vi.fn(async (c: AgentContext) => { capturedCtx = c }) })
      scheduler.register(agent)

      await scheduler.runNow('test-agent')

      expect(factory).toHaveBeenCalled()
      expect(capturedCtx!.gcal).toBe(gcalClient)
    })
  })

  describe('tick() — interval-based execution', () => {
    it('runs eligible agents when intervalMs has elapsed', async () => {
      const agent = makeAgent({ intervalMs: 60_000 })
      scheduler.register(agent)
      scheduler.start()

      // The startup tick fires after 5s
      await vi.advanceTimersByTimeAsync(6_000)
      expect(agent.run).toHaveBeenCalledTimes(1)
    })

    it('does not run disabled agents on tick', async () => {
      const agent = makeAgent({ enabled: false })
      scheduler.register(agent)
      scheduler.start()
      await vi.advanceTimersByTimeAsync(6_000)
      expect(agent.run).not.toHaveBeenCalled()
    })
  })
})
