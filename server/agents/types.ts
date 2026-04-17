import type { Client } from '@notionhq/client'
import type Anthropic from '@anthropic-ai/sdk'
import type { AgentTrigger } from './dynamic-runner.js'

// ── Context passed to every agent run ─────────────────────────────────────────

export interface AgentContext {
  /** Broadcast a WebSocket message to the board */
  broadcast: (msg: object) => void
  /** Speak text aloud via the board's voice system */
  speak: (text: string) => void
  /** Push a notification to the user's phone via ntfy */
  notify: (title: string, body: string, opts?: { priority?: 'min'|'low'|'default'|'high'|'urgent'; tags?: string[] }) => Promise<void>
  /** Notion API client */
  notion: Client
  /** Anthropic client for Claude calls */
  anthropic: Anthropic
  /** GCal OAuth2 client (null if not configured) */
  gcal: any | null
  /** Current board state snapshot */
  boards: any[]
  activeBoardId: string
  /** ID of the user this scheduler is running for */
  userId: string
}

// ── Agent definition ──────────────────────────────────────────────────────────

export interface Agent {
  /** Unique stable ID */
  id: string
  /** Human-readable name */
  name: string
  /** What this agent does */
  description: string
  /** Optional emoji icon */
  icon?: string
  /** Pixel art sprite key (cat, dog, robot, bunny, ghost, owl, bear, frog) */
  spriteType?: string
  /** How often to run, in milliseconds (fallback polling when no triggers match) */
  intervalMs: number
  /** Whether this agent is active */
  enabled: boolean
  /** Event-driven triggers — agent fires immediately when any trigger condition is met */
  triggers?: AgentTrigger[]
  /** The agent's logic — fetch data, reason, act */
  run: (ctx: AgentContext, extra?: { reminderText?: string }) => Promise<void>
}

// ── Run record ────────────────────────────────────────────────────────────────

export interface AgentRun {
  agentId:    string
  startedAt:  Date
  durationMs: number
  output?:    string   // what the agent spoke or did
  error?:     string
}
