import type { Client } from '@notionhq/client'
import type Anthropic from '@anthropic-ai/sdk'

export interface ToolContext {
  notion: Client
  gcal: any | null
}

export interface VoiceTool {
  definition: Anthropic.Tool
  execute: (input: Record<string, any>, ctx: ToolContext) => Promise<string>
}
