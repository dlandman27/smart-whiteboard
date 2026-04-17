import type { Agent, AgentContext, AgentRun } from './types.js'
import { log, error as logError } from '../lib/logger.js'

// ── AgentScheduler ─────────────────────────────────────────────────────────────
//
// Registers agents and runs them on their configured intervals.
// A single setInterval ticks every minute and checks which agents are due.
// This avoids N timers and makes it easy to inspect/pause/run-now from outside.

const TICK_MS = 60_000  // check every minute

export class AgentScheduler {
  private agents      = new Map<string, Agent>()
  private lastRun     = new Map<string, number>()
  private history     = new Map<string, AgentRun[]>()
  private timer:      ReturnType<typeof setInterval> | null = null
  private gcalFactory: (() => Promise<any | null>) | null = null
  readonly ctx:       AgentContext

  constructor(ctx: AgentContext) {
    this.ctx = ctx
  }

  /** Provide an async factory that resolves the GCal client before each agent run. */
  setGCalFactory(factory: () => Promise<any | null>): this {
    this.gcalFactory = factory
    return this
  }

  // ── Registration ────────────────────────────────────────────────────────────

  register(agent: Agent): this {
    this.agents.set(agent.id, agent)
    this.history.set(agent.id, [])
    return this
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  start(): void {
    if (this.timer) return
    log(`[Agents] Scheduler started — ${this.agents.size} agents registered`)
    this.timer = setInterval(() => this.tick(), TICK_MS)
    // Run eligible agents immediately on startup (after a short delay so server is ready)
    setTimeout(() => this.tick(), 5_000)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    log('[Agents] Scheduler stopped')
  }

  /** Force-run a specific agent right now, ignoring its interval */
  async runNow(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Unknown agent: ${agentId}`)
    await this.execute(agent)
  }

  // ── Status ────────────────────────────────────────────────────────────────────

  status(): Array<{ id: string; name: string; description: string; icon: string; spriteType?: string; enabled: boolean; intervalMs: number; lastRun: string | null; nextRun: string | null }> {
    return [...this.agents.values()].map((a) => {
      const last = this.lastRun.get(a.id) ?? null
      const next = last ? new Date(last + a.intervalMs).toISOString() : 'soon'
      return {
        id:          a.id,
        name:        a.name,
        description: a.description,
        icon:        a.icon ?? '🤖',
        spriteType:  a.spriteType,
        enabled:     a.enabled,
        intervalMs:  a.intervalMs,
        lastRun:     last ? new Date(last).toISOString() : null,
        nextRun:     a.enabled ? next : null,
      }
    })
  }

  setEnabled(agentId: string, enabled: boolean): void {
    const agent = this.agents.get(agentId)
    if (agent) agent.enabled = enabled
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private tick(): void {
    const now = Date.now()
    for (const agent of this.agents.values()) {
      if (!agent.enabled) continue
      const last = this.lastRun.get(agent.id) ?? 0
      if (now - last >= agent.intervalMs) {
        this.execute(agent).catch(() => {}) // errors logged inside execute
      }
    }
  }

  private async execute(agent: Agent): Promise<void> {
    const start = Date.now()
    this.lastRun.set(agent.id, start)
    log(`[Agent:${agent.name}] Running…`)

    // Wake the pet on the board
    this.ctx.broadcast({ type: 'pet_wake', agentId: agent.id })

    // Resolve gcal fresh for this run (tokens may have refreshed since startup)
    const gcal = this.gcalFactory ? await this.gcalFactory() : this.ctx.gcal

    // Wrap ctx.speak so every spoken line also lights up the pet bubble
    const originalSpeak = this.ctx.speak.bind(this.ctx)
    const patchedCtx: typeof this.ctx = {
      ...this.ctx,
      gcal,
      speak: (text: string) => {
        originalSpeak(text)
        this.ctx.broadcast({ type: 'pet_message', agentId: agent.id, text })
      },
    }

    let error: string | undefined
    try {
      await agent.run(patchedCtx)
    } catch (err: any) {
      error = String(err?.message ?? err)
      logError(`[Agent:${agent.name}] Error: ${error}`)
    }

    // Return pet to idle (speech bubble will linger until timeout on the client)
    this.ctx.broadcast({ type: 'pet_idle', agentId: agent.id })

    const run: AgentRun = { agentId: agent.id, startedAt: new Date(start), durationMs: Date.now() - start, error }
    const hist = this.history.get(agent.id) ?? []
    hist.unshift(run)
    if (hist.length > 10) hist.pop()
    this.history.set(agent.id, hist)
    log(`[Agent:${agent.name}] Done in ${run.durationMs}ms${error ? ' (error)' : ''}`)
  }
}
