import { loadMemory, saveMemory } from '../memory.js'
import { compileBriefing } from '../briefing.js'
import type { VoiceTool } from './_types.js'

export const systemTools: VoiceTool[] = [
  {
    definition: {
      name:        'manage_agents',
      description: 'List, enable, disable, trigger, create, or delete background agents. Use "create" when the user asks to make a new agent or automated task. Use "delete" to remove a user-created agent by ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action:      { type: 'string', enum: ['list', 'run', 'enable', 'disable', 'create', 'delete'], description: '"list" shows all agents. "run" triggers one immediately. "enable"/"disable" toggle it. "create" makes a new agent. "delete" removes a user-created agent.' },
          agentId:     { type: 'string', description: 'Required for run/enable/disable/delete.' },
          name:        { type: 'string', description: 'Required for create. Human-readable agent name.' },
          description: { type: 'string', description: 'Required for create. Plain-English instructions — what should the agent check and do each time it runs?' },
          icon:        { type: 'string', description: 'Optional emoji icon for the agent. Default: 🤖' },
          intervalMs:  { type: 'number', description: 'Optional run interval in milliseconds. Default: 3600000 (1 hour). Common: 900000=15min, 1800000=30min, 10800000=3h, 21600000=6h, 86400000=daily.' },
        },
        required: ['action'],
      },
    },
    execute: async (input) => {
      const port = Number(process.env.PORT) || 3001
      const { action, agentId, name, description, icon, intervalMs } = input as {
        action: string; agentId?: string; name?: string; description?: string; icon?: string; intervalMs?: number
      }

      if (action === 'list') {
        const status = await fetch(`http://localhost:${port}/api/agents`).then((r) => r.json()) as any[]
        return status.map((a: any) =>
          `${a.icon ?? '🤖'} ${a.name} (${a.id}): ${a.enabled ? 'enabled' : 'disabled'}, last ran ${a.lastRun ? new Date(a.lastRun).toLocaleTimeString() : 'never'}`
        ).join('\n')
      }

      if (action === 'create') {
        if (!name || !description) return 'name and description are required to create an agent'
        const res  = await fetch(`http://localhost:${port}/api/agents`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, description, icon: icon ?? '🤖', intervalMs: intervalMs ?? 3_600_000 }),
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
]
