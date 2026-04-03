import type { Agent, AgentContext, AgentRun } from './types.js'

// ── AgentScheduler ─────────────────────────────────────────────────────────────
//
// Registers agents and runs them on their configured intervals.
// A single setInterval ticks every minute and checks which agents are due.
// This avoids N timers and makes it easy to inspect/pause/run-now from outside.

const TICK_MS = 60_000  // check every minute

export class AgentScheduler {
  private agents  = new Map<string, Agent>()
  private lastRun = new Map<string, number>()
  private history = new Map<string, AgentRun[]>()
  private timer:  ReturnType<typeof setInterval> | null = null
  readonly ctx:   AgentContext

  constructor(ctx: AgentContext) {
    this.ctx = ctx
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
    console.log(`[Agents] Scheduler started — ${this.agents.size} agents registered`)
    this.timer = setInterval(() => this.tick(), TICK_MS)
    // Run eligible agents immediately on startup (after a short delay so server is ready)
    setTimeout(() => this.tick(), 5_000)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    console.log('[Agents] Scheduler stopped')
  }

  /** Force-run a specific agent right now, ignoring its interval */
  async runNow(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Unknown agent: ${agentId}`)
    await this.execute(agent)
  }

  // ── Status ────────────────────────────────────────────────────────────────────

  status(): Array<{ id: string; name: string; enabled: boolean; lastRun: string | null; nextRun: string | null }> {
    return [...this.agents.values()].map((a) => {
      const last = this.lastRun.get(a.id) ?? null
      const next = last ? new Date(last + a.intervalMs).toISOString() : 'soon'
      return {
        id:       a.id,
        name:     a.name,
        enabled:  a.enabled,
        lastRun:  last ? new Date(last).toISOString() : null,
        nextRun:  a.enabled ? next : null,
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
    console.log(`[Agent:${agent.name}] Running…`)
    let error: string | undefined
    try {
      await agent.run(this.ctx)
    } catch (err: any) {
      error = String(err?.message ?? err)
      console.error(`[Agent:${agent.name}] Error: ${error}`)
    }
    const run: AgentRun = { agentId: agent.id, startedAt: new Date(start), durationMs: Date.now() - start, error }
    const hist = this.history.get(agent.id) ?? []
    hist.unshift(run)
    if (hist.length > 10) hist.pop()
    this.history.set(agent.id, hist)
    console.log(`[Agent:${agent.name}] Done in ${run.durationMs}ms${error ? ' (error)' : ''}`)
  }
}
