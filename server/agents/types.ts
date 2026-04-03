import type { Client } from '@notionhq/client'
import type Anthropic from '@anthropic-ai/sdk'

// ── Context passed to every agent run ─────────────────────────────────────────

export interface AgentContext {
  /** Broadcast a WebSocket message to the board */
  broadcast: (msg: object) => void
  /** Speak text aloud via the board's voice system */
  speak: (text: string) => void
  /** Notion API client */
  notion: Client
  /** Anthropic client for Claude calls */
  anthropic: Anthropic
  /** GCal OAuth2 client (null if not configured) */
  gcal: any | null
  /** Current board state snapshot */
  boards: any[]
  activeBoardId: string
}

// ── Agent definition ──────────────────────────────────────────────────────────

export interface Agent {
  /** Unique stable ID */
  id: string
  /** Human-readable name */
  name: string
  /** What this agent does */
  description: string
  /** How often to run, in milliseconds */
  intervalMs: number
  /** Whether this agent is active */
  enabled: boolean
  /** The agent's logic — fetch data, reason, act */
  run: (ctx: AgentContext) => Promise<void>
}

// ── Run record ────────────────────────────────────────────────────────────────

export interface AgentRun {
  agentId:   string
  startedAt: Date
  durationMs: number
  error?:    string
}
