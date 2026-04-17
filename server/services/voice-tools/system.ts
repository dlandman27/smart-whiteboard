import { loadMemory, saveMemory } from '../memory.js'
import { compileBriefing } from '../briefing.js'
import { getAgentState, setAgentState, getAllAgentState } from '../agent-state.js'
import type { VoiceTool } from './_types.js'

export const systemTools: VoiceTool[] = [
  {
    definition: {
      name:        'manage_agents',
      description: 'List, enable, disable, trigger, create, describe, or delete background agents. Use "describe" when the user gives a goal and wants Walli to design the agent — it returns a JSON proposal. Use "create" to actually save a new agent. Use "delete" to remove a user-created agent by ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action:      { type: 'string', enum: ['list', 'run', 'enable', 'disable', 'create', 'describe', 'delete'], description: '"list" shows all agents. "run" triggers one immediately. "enable"/"disable" toggle it. "describe" designs an agent from a goal and returns a JSON proposal. "create" saves a new agent. "delete" removes one.' },
          agentId:     { type: 'string', description: 'Required for run/enable/disable/delete.' },
          goal:        { type: 'string', description: 'Required for describe. Plain-English goal for the agent, e.g. "alert me 10 minutes before every meeting".' },
          name:        { type: 'string', description: 'Required for create.' },
          description: { type: 'string', description: 'Required for create. Specific tool-use instructions for the agent.' },
          icon:        { type: 'string', description: 'Optional emoji icon. Default: 🤖' },
          spriteType:  { type: 'string', description: 'Optional sprite. One of: cat, dog, robot, bunny, ghost, owl, bear, frog.' },
          intervalMs:  { type: 'number', description: 'Fallback interval ms. Default: 3600000.' },
          triggers:    { type: 'array', items: { type: 'object' }, description: 'Array of AgentTrigger objects.' },
        },
        required: ['action'],
      },
    },
    execute: async (input, ctx) => {
      const port = Number(process.env.PORT) || 3001
      const { action, agentId, goal, name, description, icon, spriteType, intervalMs, triggers } = input as {
        action: string; agentId?: string; goal?: string; name?: string; description?: string
        icon?: string; spriteType?: string; intervalMs?: number; triggers?: any[]
      }

      if (action === 'list') {
        const status = await fetch(`http://localhost:${port}/api/agents`).then((r) => r.json()) as any[]
        return status.map((a: any) =>
          `${a.icon ?? '🤖'} ${a.name} (${a.id}): ${a.enabled ? 'enabled' : 'disabled'}, last ran ${a.lastRun ? new Date(a.lastRun).toLocaleTimeString() : 'never'}`
        ).join('\n')
      }

      if (action === 'describe') {
        if (!goal) return 'goal is required for describe'
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey: process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY })
        const res = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: `You design background agents for a smart whiteboard. Given a user goal, produce a JSON agent definition with these fields:
{
  "name": "short display name",
  "description": "specific tool-use instructions — what to query, what to check, when to speak/notify, how to avoid repeating",
  "icon": "single emoji",
  "spriteType": "one of: cat dog robot bunny ghost owl bear frog",
  "intervalMs": fallback poll interval number,
  "triggers": [] // array of AgentTrigger objects. Types: {type:"daily",time:"HH:MM"}, {type:"calendar_soon",minutesBefore:N}, {type:"reminder_fired"}, {type:"board_opened",boardType?:"string"}, {type:"widget_added"}, {type:"cron",expression:"* * * * *"}
}
Return ONLY valid JSON, no prose.`,
          messages: [{ role: 'user', content: `Goal: ${goal}` }],
        })
        const text = ((res.content[0] as any).text ?? '').trim()
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return 'Could not design agent — try rephrasing your goal'
        const proposal = JSON.parse(match[0])
        // Auto-create it
        const createRes = await fetch(`http://localhost:${port}/api/agents`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal),
        })
        const created = await createRes.json() as any
        if (!createRes.ok) return `Designed agent but failed to save: ${created.error}`
        return `Created "${created.name}" — ${proposal.description.slice(0, 80)}…`
      }

      if (action === 'create') {
        if (!name || !description) return 'name and description are required to create an agent'
        const res  = await fetch(`http://localhost:${port}/api/agents`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, description, icon: icon ?? '🤖', spriteType, triggers: triggers ?? [], intervalMs: intervalMs ?? 3_600_000 }),
        })
        const data = await res.json() as any
        if (!res.ok) return `Failed to create agent: ${data.error}`
        return `Created agent "${data.name}" (${data.id})`
      }

      if (action === 'delete') {
        if (!agentId) return 'agentId required for delete'
        const res = await fetch(`http://localhost:${port}/api/agents/${agentId}`, { method: 'DELETE' })
        if (!res.ok) return `Could not delete agent ${agentId}`
        return `Deleted agent ${agentId}`
      }

      if (!agentId) return 'agentId required for this action'
      if (action === 'run') {
        await fetch(`http://localhost:${port}/api/agents/${agentId}/run`, { method: 'POST' })
        return `Ran agent ${agentId}`
      }
      await fetch(`http://localhost:${port}/api/agents/${agentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: action === 'enable' }),
      })
      return `Agent ${agentId} ${action}d`
    },
  },

  {
    definition: {
      name:        'update_memory',
      description: "Save something you learned about the user so you remember it in future conversations. Call this whenever you learn the user's name, location, a preference, a useful fact, or a Notion database they use often.",
      input_schema: {
        type: 'object' as const,
        properties: {
          field: {
            type: 'string',
            enum: ['name', 'location', 'preference', 'fact', 'database'],
            description: "What kind of thing you're remembering",
          },
          value:       { type: 'string', description: 'The value to remember' },
          databaseKey: { type: 'string', description: 'Short label for the database (only used when field is "database")' },
        },
        required: ['field', 'value'],
      },
    },
    execute: async (input) => {
      const mem = loadMemory()
      const { field, value, databaseKey } = input as { field: string; value: string; databaseKey?: string }
      if (field === 'name')             mem.name = value
      else if (field === 'location')    mem.location = value
      else if (field === 'preference')  { if (!mem.preferences.includes(value)) mem.preferences.push(value) }
      else if (field === 'fact')        { if (!mem.facts.includes(value)) mem.facts.push(value) }
      else if (field === 'database')    mem.databases[databaseKey ?? value] = value
      saveMemory(mem)
      return `Remembered: ${field} = ${value}`
    },
  },

  {
    definition: {
      name:        'brief_me',
      description: "Give the user a morning briefing: weather, today's calendar events, open tasks, and last sports results. Use this when the user says \"brief me\", \"good morning\", \"what's today look like\", or similar.",
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async (_input, { notion }) => {
      return await compileBriefing(notion)
    },
  },

  {
    definition: {
      name:        'get_agent_state',
      description: 'Read a value you saved in a previous run. Use this at the start of each agent run to check what happened last time — e.g. which items you already alerted about, the last count you saw, or the last time you notified the user.',
      input_schema: {
        type: 'object' as const,
        properties: {
          key: { type: 'string', description: 'The state key to read. Use descriptive names like "alerted_ids", "last_task_count", "last_notified_at".' },
        },
        required: ['key'],
      },
    },
    execute: async (input, ctx) => {
      const agentId = (ctx as any).agentId as string | undefined
      if (!agentId) return 'error: no agentId in context'
      const value = getAgentState(agentId, input.key as string)
      return value ?? 'null'
    },
  },

  {
    definition: {
      name:        'set_agent_state',
      description: 'Persist a value so you can read it back next run. Call this after acting so you can avoid repeating yourself. Values are stored as strings — JSON-encode arrays or objects.',
      input_schema: {
        type: 'object' as const,
        properties: {
          key:   { type: 'string', description: 'State key to write.' },
          value: { type: 'string', description: 'Value to store. JSON-encode complex types.' },
        },
        required: ['key', 'value'],
      },
    },
    execute: async (input, ctx) => {
      const agentId = (ctx as any).agentId as string | undefined
      if (!agentId) return 'error: no agentId in context'
      setAgentState(agentId, input.key as string, input.value as string)
      return 'saved'
    },
  },

  {
    definition: {
      name:        'get_all_agent_state',
      description: 'Read all persisted state for this agent at once. Useful at the start of a run to get the full picture of what you remember.',
      input_schema: { type: 'object' as const, properties: {} },
    },
    execute: async (_input, ctx) => {
      const agentId = (ctx as any).agentId as string | undefined
      if (!agentId) return 'error: no agentId in context'
      const state = getAllAgentState(agentId)
      return Object.keys(state).length ? JSON.stringify(state) : 'no state saved yet'
    },
  },

  {
    definition: {
      name:        'manage_routines',
      description: 'List, add, complete, or uncomplete routines. Use "list" to read all routines with today\'s completion status. Use "add" to create a new routine. Use "complete" or "uncomplete" to toggle one for today.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action:   { type: 'string', enum: ['list', 'add', 'complete', 'uncomplete'], description: '"list" reads all routines. "add" creates one. "complete"/"uncomplete" toggles today\'s completion.' },
          id:       { type: 'string', description: 'Routine ID — required for complete/uncomplete.' },
          title:    { type: 'string', description: 'Required for add.' },
          category: { type: 'string', enum: ['morning', 'daily', 'evening'], description: 'Required for add.' },
          emoji:    { type: 'string', description: 'Optional emoji for add. Default: ✅' },
        },
        required: ['action'],
      },
    },
    execute: async (input) => {
      const port  = Number(process.env.PORT) || 3001
      const today = new Date().toISOString().slice(0, 10)
      const { action, id, title, category, emoji } = input as {
        action: string; id?: string; title?: string; category?: string; emoji?: string
      }

      if (action === 'list') {
        const [routinesRes, completionsRes] = await Promise.all([
          fetch(`http://localhost:${port}/api/routines`),
          fetch(`http://localhost:${port}/api/routines/completions?date=${today}`),
        ])
        const routines:     any[]    = await routinesRes.json()
        const completedIds: string[] = await completionsRes.json()

        if (routines.length === 0) return 'No routines set up yet.'

        const byCategory: Record<string, any[]> = { morning: [], daily: [], evening: [] }
        for (const r of routines) byCategory[r.category]?.push(r)

        return Object.entries(byCategory)
          .filter(([, rs]) => rs.length > 0)
          .map(([cat, rs]) => {
            const done = rs.filter(r => completedIds.includes(r.id)).length
            const items = rs.map(r => `  ${completedIds.includes(r.id) ? '✓' : '○'} ${r.emoji} ${r.title} (id: ${r.id})`).join('\n')
            return `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${done}/${rs.length} done):\n${items}`
          })
          .join('\n\n')
      }

      if (action === 'add') {
        if (!title || !category) return 'title and category are required to add a routine'
        const res  = await fetch(`http://localhost:${port}/api/routines`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ title, category, emoji: emoji ?? '✅' }),
        })
        const data = await res.json() as any
        if (!res.ok) return `Failed to create routine: ${data.error}`
        return `Added "${data.title}" to ${data.category} routines.`
      }

      if (action === 'complete' || action === 'uncomplete') {
        if (!id) return 'id is required'
        const method = action === 'complete' ? 'POST' : 'DELETE'
        const url    = action === 'complete'
          ? `http://localhost:${port}/api/routines/${id}/complete`
          : `http://localhost:${port}/api/routines/${id}/complete?date=${today}`
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          ...(action === 'complete' ? { body: JSON.stringify({ date: today }) } : {}),
        })
        if (!res.ok) return `Failed to ${action} routine`
        return `Routine marked as ${action === 'complete' ? 'done' : 'not done'} for today.`
      }

      return 'Unknown action'
    },
  },
]
