import db from '../services/db.js'
import type { Agent, AgentContext } from './types.js'

// ── User-defined agent definition ──────────────────────────────────────────────

export interface UserAgentDef {
  id:          string
  name:        string
  description: string   // natural-language instructions — Claude interprets this at runtime
  intervalMs:  number
  enabled:     boolean
  icon:        string   // emoji
  spriteType?: string   // pixel art sprite key (cat, dog, robot, etc.)
  createdAt:   string
}

type AgentRow = {
  id: string; name: string; description: string; interval_ms: number
  enabled: number; icon: string; sprite_type: string | null; created_at: string
}

function rowToDef(r: AgentRow): UserAgentDef {
  return {
    id:          r.id,
    name:        r.name,
    description: r.description,
    intervalMs:  r.interval_ms,
    enabled:     r.enabled === 1,
    icon:        r.icon,
    spriteType:  r.sprite_type ?? undefined,
    createdAt:   r.created_at,
  }
}

// ── Persistence ────────────────────────────────────────────────────────────────

export function readUserAgents(): UserAgentDef[] {
  return (db.prepare('SELECT * FROM user_agents').all() as AgentRow[]).map(rowToDef)
}

export function addUserAgent(def: Omit<UserAgentDef, 'createdAt'>): UserAgentDef {
  const exists = db.prepare('SELECT id FROM user_agents WHERE id = ?').get(def.id)
  if (exists) throw new Error(`Agent "${def.id}" already exists`)
  const full: UserAgentDef = { ...def, createdAt: new Date().toISOString() }
  db.prepare(`INSERT INTO user_agents (id, name, description, interval_ms, enabled, icon, sprite_type, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(full.id, full.name, full.description, full.intervalMs, full.enabled ? 1 : 0,
         full.icon, full.spriteType ?? null, full.createdAt)
  return full
}

export function removeUserAgent(id: string): void {
  db.prepare('DELETE FROM user_agents WHERE id = ?').run(id)
}

export function updateUserAgent(id: string, patch: Partial<UserAgentDef>): UserAgentDef {
  const row = db.prepare('SELECT * FROM user_agents WHERE id = ?').get(id) as AgentRow | undefined
  if (!row) throw new Error(`Agent "${id}" not found`)
  const updated = rowToDef({ ...row, ...patch as any })
  db.prepare(`UPDATE user_agents
              SET name=?, description=?, interval_ms=?, enabled=?, icon=?, sprite_type=?
              WHERE id=?`)
    .run(updated.name, updated.description, updated.intervalMs, updated.enabled ? 1 : 0,
         updated.icon, updated.spriteType ?? null, id)
  return updated
}

// ── Build an Agent instance from a UserAgentDef ────────────────────────────────
//
// The run() function calls Claude with the agent's description + board context.
// Claude responds with a structured action plan; we execute speak/notify/broadcast.

export function buildDynamicAgent(def: UserAgentDef): Agent {
  return {
    id:          def.id,
    name:        def.name,
    description: def.description,
    icon:        def.icon,
    spriteType:  def.spriteType,
    intervalMs:  def.intervalMs,
    enabled:     def.enabled,

    async run(ctx: AgentContext) {
      const boardSummary = summarizeBoards(ctx)

      const response = await ctx.anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You are Walli, an AI assistant running inside a smart whiteboard. You are executing a user-defined agent.

The user described this agent as:
"${def.description}"

Your job is to decide what to do RIGHT NOW based on this description and the current board state.
Respond with a JSON object with these optional fields:
{
  "speak": "text to say aloud on the board (null if nothing to say)",
  "notify": { "title": "...", "body": "...", "priority": "default|high|urgent" } or null,
  "broadcast": { "type": "...", ...any fields } or null,
  "skip": true  // set to true if the agent determines there's nothing to do this run
}
Be concise. Only act if there is genuinely something to report or do.`,
        messages: [{
          role:    'user',
          content: `Current board state:\n${boardSummary}\n\nCurrent time: ${new Date().toLocaleString()}`,
        }],
      })

      let action: any
      try {
        const text = ((response.content[0] as any).text ?? '').trim()
        // Extract JSON from the response
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return
        action = JSON.parse(match[0])
      } catch {
        return
      }

      if (action.skip) return

      if (action.speak)     ctx.speak(action.speak)
      if (action.broadcast) ctx.broadcast(action.broadcast)
      if (action.notify) {
        await ctx.notify(
          action.notify.title ?? def.name,
          action.notify.body  ?? '',
          { priority: action.notify.priority ?? 'default', tags: [def.id] },
        )
      }
    },
  }
}

// ── Load all user agents as Agent instances ────────────────────────────────────

export function loadDynamicAgents(): Agent[] {
  return readUserAgents().map(buildDynamicAgent)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function summarizeBoards(ctx: AgentContext): string {
  const board = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)
  if (!board) return 'No active board.'
  const widgets = (board.widgets ?? []).map((w: any) =>
    `- ${w.type} (id: ${w.id})${w.settings?.label ? ` "${w.settings.label}"` : ''}`
  ).join('\n')
  return `Active board: "${board.name}"\nWidgets:\n${widgets || '(none)'}`
}
