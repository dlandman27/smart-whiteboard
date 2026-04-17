import type Anthropic from '@anthropic-ai/sdk'
import db from '../services/db.js'
import { memoryToPrompt, loadMemory } from '../services/memory.js'
import { getBoardSnapshot } from '../services/board-utils.js'
import { VOICE_TOOLS, executeVoiceTool } from '../services/voice-tools/registry.js'
import type { Agent, AgentContext } from './types.js'

// ── Trigger types ──────────────────────────────────────────────────────────────

export type AgentTrigger =
  | { type: 'cron';          expression: string }
  | { type: 'daily';         time: string }           // HH:MM
  | { type: 'calendar_soon'; minutesBefore: number }
  | { type: 'board_opened';  boardType?: string }
  | { type: 'widget_added';  widgetType?: string }
  | { type: 'reminder_fired' }

// ── User-defined agent definition ──────────────────────────────────────────────

export interface UserAgentDef {
  id:          string
  name:        string
  description: string
  intervalMs:  number
  enabled:     boolean
  icon:        string
  spriteType?: string
  triggers:    AgentTrigger[]
  createdAt:   string
}

type AgentRow = {
  id: string; name: string; description: string; interval_ms: number
  enabled: number; icon: string; sprite_type: string | null
  triggers: string; created_at: string
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
    triggers:    JSON.parse(r.triggers ?? '[]'),
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
  const full: UserAgentDef = { ...def, triggers: def.triggers ?? [], createdAt: new Date().toISOString() }
  db.prepare(`INSERT INTO user_agents (id, name, description, interval_ms, enabled, icon, sprite_type, triggers, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(full.id, full.name, full.description, full.intervalMs, full.enabled ? 1 : 0,
         full.icon, full.spriteType ?? null, JSON.stringify(full.triggers), full.createdAt)
  return full
}

export function removeUserAgent(id: string): void {
  db.prepare('DELETE FROM user_agents WHERE id = ?').run(id)
}

export function updateUserAgent(id: string, patch: Partial<UserAgentDef>): UserAgentDef {
  const row = db.prepare('SELECT * FROM user_agents WHERE id = ?').get(id) as AgentRow | undefined
  if (!row) throw new Error(`Agent "${id}" not found`)
  const updated = rowToDef({ ...row, ...(patch as any) })
  db.prepare(`UPDATE user_agents
              SET name=?, description=?, interval_ms=?, enabled=?, icon=?, sprite_type=?, triggers=?
              WHERE id=?`)
    .run(updated.name, updated.description, updated.intervalMs, updated.enabled ? 1 : 0,
         updated.icon, updated.spriteType ?? null, JSON.stringify(updated.triggers), id)
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
    triggers:    def.triggers,

    async run(ctx: AgentContext, extra?: { reminderText?: string }) {
      const toolCtx = { notion: ctx.notion, gcal: ctx.gcal, userId: 'local', agentId: def.id }

      const triggerNote = extra?.reminderText
        ? ` A reminder just fired: "${extra.reminderText}".`
        : ''

      const messages: Anthropic.MessageParam[] = [{
        role:    'user',
        content: `It is ${new Date().toLocaleString()}.${triggerNote} Run your agent logic now.`,
      }]

      for (let turn = 0; turn < 8; turn++) {
        const response = await ctx.anthropic.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: [
            `You are Walli, a background agent running inside a smart whiteboard.${memoryToPrompt(loadMemory())}${getBoardSnapshot()}`,
            `The user configured you with this description: "${def.description}"`,
            'ALWAYS start by calling get_all_agent_state to see what you remember from previous runs.',
            'Use your tools to fetch real data and act on it. Only speak or notify if there is genuinely something worth reporting — do not make things up.',
            'After acting, call set_agent_state to save what you did (e.g. which IDs you already alerted, last count seen, last notified time) so you never repeat yourself unnecessarily.',
            'If there is nothing to do this run, respond with the single word: skip',
            'Keep spoken responses to 1-2 short sentences. Never use markdown.',
            `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
          ].join(' '),
          tools:    VOICE_TOOLS,
          messages,
        })

        if (response.stop_reason === 'end_turn') {
          const text = (response.content.find((b) => b.type === 'text') as Anthropic.TextBlock | undefined)?.text?.trim() ?? ''
          if (text && text.toLowerCase() !== 'skip') ctx.speak(text)
          break
        }

        if (response.stop_reason === 'tool_use') {
          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of response.content) {
            if (block.type !== 'tool_use') continue
            const input = block.input as Record<string, any>

            // Intercept speak/notify so they go through AgentContext instead of a tool response
            if (block.name === 'speak' || block.name === 'tts') {
              ctx.speak(input.text ?? '')
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'spoken' })
              continue
            }
            if (block.name === 'send_notification') {
              await ctx.notify(input.title ?? def.name, input.body ?? '', {
                priority: input.priority ?? 'default',
                tags:     [def.id],
              })
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'sent' })
              continue
            }

            const result = await executeVoiceTool(block.name, input, toolCtx)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
          messages.push({ role: 'assistant', content: response.content })
          messages.push({ role: 'user',      content: toolResults })
        }
      }
    },
  }
}

// ── Load all user agents as Agent instances ────────────────────────────────────

export function loadDynamicAgents(): Agent[] {
  return readUserAgents().map(buildDynamicAgent)
}

