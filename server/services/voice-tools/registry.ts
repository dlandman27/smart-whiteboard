import type Anthropic from '@anthropic-ai/sdk'
import type { Client } from '@notionhq/client'
import type { ToolContext } from './_types.js'
import { boardTools }    from './board.js'
import { notionTools }   from './notion.js'
import { mediaTools }    from './media.js'
import { webTools }      from './web.js'
import { systemTools }   from './system.js'
import { timerTools }    from './timers.js'
import { calendarTools } from './calendar.js'

const allTools = [
  ...boardTools,
  ...notionTools,
  ...calendarTools,
  ...mediaTools,
  ...webTools,
  ...systemTools,
  ...timerTools,
]

const toolMap = new Map(allTools.map((t) => [t.definition.name, t]))

export const VOICE_TOOLS: Anthropic.Tool[] = allTools.map((t) => t.definition)

export async function executeVoiceTool(
  name: string,
  input: Record<string, any>,
  ctx: ToolContext,
): Promise<string> {
  const tool = toolMap.get(name)
  if (!tool) return `Unknown tool: ${name}`
  return tool.execute(input, ctx)
}

export type { ToolContext }
