import { EventEmitter } from 'events'
import type { Agent, AgentContext, AgentRun } from './types.js'
import { fetchBoardState } from '../services/board-utils.js'
import type { AgentTrigger } from './dynamic-runner.js'
import { getAgentState, setAgentState } from '../services/agent-state.js'
import db from '../services/db.js'
import { log, error as logError } from '../lib/logger.js'

// ── Shared internal event bus ──────────────────────────────────────────────────
// Other server modules (reminders cron, WS handler) emit events here so the
// scheduler can fire agents without coupling them directly.

export const agentEvents = new EventEmitter()

// ── Cron matcher ───────────────────────────────────────────────────────────────
// Supports: * and exact numbers only (no ranges/steps — sufficient for user configs)

function matchesCron(expr: string, now: Date): boolean {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [minute, hour, dom, month, dow] = parts
  const check = (field: string, val: number) =>
    field === '*' || parseInt(field, 10) === val
  return (
    check(minute, now.getMinutes()) &&
    check(hour,   now.getHours())   &&
    check(dom,    now.getDate())    &&
    check(month,  now.getMonth() + 1) &&
    check(dow,    now.getDay())
  )
}

function matchesDaily(time: string, now: Date): boolean {
  const [h, m] = time.split(':').map(Number)
  return now.getHours() === h && now.getMinutes() === m
}

// ── AgentScheduler ─────────────────────────────────────────────────────────────

const TICK_MS = 60_000

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

    // Interval tick — handles polling + cron + daily triggers
    this.timer = setInterval(() => this.tick(), TICK_MS)
    setTimeout(() => this.tick(), 5_000)

    // ── Event-driven triggers ──────────────────────────────────────────────────

    // board_opened — emitted by WS handler when client sends board_switched
    agentEvents.on('board_opened', (boardType: string) => {
      for (const agent of this.agents.values()) {
        if (!agent.enabled) continue
        const triggers = (agent.triggers ?? []) as AgentTrigger[]
        if (triggers.some((t) => t.type === 'board_opened' && (!t.boardType || t.boardType === boardType))) {
          this.execute(agent).catch(() => {})
        }
      }
    })

    // widget_added — emitted by WS handler when client sends widget_added
    agentEvents.on('widget_added', (widgetType: string) => {
      for (const agent of this.agents.values()) {
        if (!agent.enabled) continue
        const triggers = (agent.triggers ?? []) as AgentTrigger[]
        if (triggers.some((t) => t.type === 'widget_added' && (!t.widgetType || t.widgetType === widgetType))) {
          this.execute(agent).catch(() => {})
        }
      }
    })

    // reminder_fired — emitted by the reminders cron after broadcasting a reminder
    agentEvents.on('reminder_fired', (reminderText: string) => {
      for (const agent of this.agents.values()) {
        if (!agent.enabled) continue
        const triggers = (agent.triggers ?? []) as AgentTrigger[]
        if (triggers.some((t) => t.type === 'reminder_fired')) {
          this.execute(agent, { reminderText }).catch(() => {})
        }
      }
    })
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    agentEvents.removeAllListeners()
    log('[Agents] Scheduler stopped')
  }

  async runNow(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Unknown agent: ${agentId}`)
    await this.execute(agent)
  }

  // ── Status ────────────────────────────────────────────────────────────────────

  status(): Array<{
    id: string; name: string; description: string; icon: string
    spriteType?: string; enabled: boolean; intervalMs: number
    triggers: AgentTrigger[]; lastRun: string | null; nextRun: string | null
  }> {
    return [...this.agents.values()].map((a) => {
      const last     = this.lastRun.get(a.id) ?? null
      const triggers = (a.triggers ?? []) as AgentTrigger[]
      // nextRun only meaningful for interval-polled agents with no triggers
      const next = triggers.length === 0 && last
        ? new Date(last + a.intervalMs).toISOString()
        : triggers.length > 0 ? 'event-driven' : 'soon'
      return {
        id:          a.id,
        name:        a.name,
        description: a.description,
        icon:        a.icon ?? '🤖',
        spriteType:  a.spriteType,
        enabled:     a.enabled,
        intervalMs:  a.intervalMs,
        triggers,
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
    const now = new Date()
    const nowMs = now.getTime()

    for (const agent of this.agents.values()) {
      if (!agent.enabled) continue
      const triggers = (agent.triggers ?? []) as AgentTrigger[]

      // Check time-based triggers (cron / daily)
      const timeTriggerFired = triggers.some((t) => {
        if (t.type === 'cron')  return matchesCron(t.expression, now)
        if (t.type === 'daily') return matchesDaily(t.time, now)
        return false
      })
      if (timeTriggerFired) {
        this.execute(agent).catch(() => {})
        continue
      }

      // calendar_soon — check GCal for upcoming events
      const calSoon = triggers.find((t): t is Extract<AgentTrigger, { type: 'calendar_soon' }> =>
        t.type === 'calendar_soon'
      )
      if (calSoon) {
        this.checkCalendarSoon(agent, calSoon.minutesBefore).catch(() => {})
        continue
      }

      // Fallback: interval polling (only for agents with no triggers)
      if (triggers.length === 0) {
        const last = this.lastRun.get(agent.id) ?? 0
        if (nowMs - last >= agent.intervalMs) {
          this.execute(agent).catch(() => {})
        }
      }
    }
  }

  private async checkCalendarSoon(agent: Agent, minutesBefore: number): Promise<void> {
    const gcal = this.gcalFactory ? await this.gcalFactory() : this.ctx.gcal
    if (!gcal) return

    const now      = new Date()
    const windowMs = (minutesBefore + 1) * 60_000
    const maxTime  = new Date(now.getTime() + windowMs)

    let events: any[]
    try {
      const res = await gcal.events.list({
        calendarId:   'primary',
        timeMin:      now.toISOString(),
        timeMax:      maxTime.toISOString(),
        singleEvents: true,
        maxResults:   10,
      })
      events = res.data.items ?? []
    } catch {
      return
    }

    if (events.length === 0) return

    // Deduplicate using agent state so we only alert once per event
    const alertedRaw = getAgentState(agent.id, 'calendar_soon_alerted') ?? '[]'
    const alerted: string[] = JSON.parse(alertedRaw)

    const newEvents = events.filter((e: any) => e.id && !alerted.includes(e.id))
    if (newEvents.length === 0) return

    // Prune alerted IDs older than 2h to keep the set small
    const freshAlerted = alerted.filter((id) => {
      const ev = events.find((e: any) => e.id === id)
      return ev !== undefined
    })
    setAgentState(agent.id, 'calendar_soon_alerted', JSON.stringify([...freshAlerted, ...newEvents.map((e: any) => e.id)]))

    await this.execute(agent)
  }

  private async execute(agent: Agent, extraCtx?: { reminderText?: string }): Promise<void> {
    const start = Date.now()
    this.lastRun.set(agent.id, start)
    log(`[Agent:${agent.name}] Running…`)

    this.ctx.broadcast({ type: 'pet_wake', agentId: agent.id })

    const gcalResult = this.gcalFactory ? await this.gcalFactory() : { client: this.ctx.gcal, userId: this.ctx.userId }
    const gcal       = (gcalResult as any)?.client ?? gcalResult
    const userId     = (gcalResult as any)?.userId ?? this.ctx.userId

    const { boards, activeBoardId } = await fetchBoardState(userId).catch(() => ({ boards: [], activeBoardId: '' }))

    const spokenLines: string[] = []
    const originalSpeak = this.ctx.speak.bind(this.ctx)
    const patchedCtx: typeof this.ctx = {
      ...this.ctx,
      gcal,
      userId,
      boards,
      activeBoardId,
      speak: (text: string) => {
        originalSpeak(text)
        spokenLines.push(text)
        this.ctx.broadcast({ type: 'pet_message', agentId: agent.id, text })
      },
    }

    let error: string | undefined
    try {
      await agent.run(patchedCtx, extraCtx)
    } catch (err: any) {
      error = String(err?.message ?? err)
      logError(`[Agent:${agent.name}] Error: ${error}`)
    }

    this.ctx.broadcast({ type: 'pet_idle', agentId: agent.id })

    const durationMs = Date.now() - start
    const output     = spokenLines.length ? spokenLines.join(' | ') : undefined
    const run: AgentRun = { agentId: agent.id, startedAt: new Date(start), durationMs, output, error }

    // Persist to DB (keep last 20 per agent)
    try {
      db.prepare(`INSERT INTO agent_runs (agent_id, started_at, duration_ms, output, error)
                  VALUES (?, ?, ?, ?, ?)`)
        .run(agent.id, new Date(start).toISOString(), durationMs, output ?? null, error ?? null)
      db.prepare(`DELETE FROM agent_runs WHERE agent_id = ? AND id NOT IN (
                    SELECT id FROM agent_runs WHERE agent_id = ? ORDER BY id DESC LIMIT 20
                  )`).run(agent.id, agent.id)
    } catch { /* non-fatal */ }

    const hist = this.history.get(agent.id) ?? []
    hist.unshift(run)
    if (hist.length > 10) hist.pop()
    this.history.set(agent.id, hist)
    log(`[Agent:${agent.name}] Done in ${durationMs}ms${error ? ' (error)' : ''}`)
  }
}

export function createScheduler(ctx: AgentContext): AgentScheduler {
  return new AgentScheduler(ctx)
}
