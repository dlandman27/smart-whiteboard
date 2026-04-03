import fs   from 'fs'
import path from 'path'
import type { Agent, AgentContext } from '../types.js'

// ── State ─────────────────────────────────────────────────────────────────────
// Track which overdue task IDs we've already alerted about today.
// Resets at midnight so users are re-alerted the next day.

const alertedToday = new Set<string>()

function resetAtMidnight() {
  const now = new Date()
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
  setTimeout(() => { alertedToday.clear(); resetAtMidnight() }, msUntilMidnight)
}
resetAtMidnight()

// ── Agent ─────────────────────────────────────────────────────────────────────

export const taskMonitorAgent: Agent = {
  id:          'task-monitor',
  name:        'Task Monitor',
  description: 'Watches Notion task databases for overdue items and speaks an alert.',
  intervalMs:  15 * 60_000,  // every 15 minutes
  enabled:     true,

  async run(ctx: AgentContext) {
    const taskDbIds = getTaskDatabaseIds(ctx)
    if (taskDbIds.length === 0) return

    const today = new Date().toISOString().slice(0, 10)
    const overdue: { id: string; name: string; due: string }[] = []

    for (const dbId of taskDbIds) {
      try {
        const result = await (ctx.notion.databases.query as any)({
          database_id: dbId,
          filter: {
            and: [
              { property: 'due',    date:   { before:         today } },
              { property: 'Status', status: { does_not_equal: 'Done' } },
            ],
          },
          page_size: 10,
        })
        for (const page of (result.results as any[])) {
          const name = extractTitle(page.properties)
          const due  = page.properties['due']?.date?.start ?? ''
          if (name && !alertedToday.has(page.id)) {
            overdue.push({ id: page.id, name, due })
          }
        }
      } catch {
        // Database may not have these exact property names — skip silently
      }
    }

    if (overdue.length === 0) return

    // Mark alerted before speaking so a crash doesn't cause repeat spam
    for (const t of overdue) alertedToday.add(t.id)

    // Ask Claude to generate a natural spoken alert
    const taskList = overdue.map((t) => `- ${t.name} (due ${t.due})`).join('\n')
    const response = await ctx.anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system:     'You are Walli, a smart whiteboard assistant. Write one short spoken alert (max 15 words) about overdue tasks. No markdown.',
      messages:   [{ role: 'user', content: `Overdue:\n${taskList}` }],
    })
    const text = ((response.content[0] as any).text ?? '').trim()
    if (text) ctx.speak(text)

    // Flash the task widget on the board
    const widgets = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)?.widgets ?? []
    const taskWidget = widgets.find((w: any) =>
      w.type === '@whiteboard/notion-view' && taskDbIds.includes(w.settings?.databaseId)
    )
    if (taskWidget) ctx.broadcast({ type: 'flash_widget', id: taskWidget.id })
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTaskDatabaseIds(ctx: AgentContext): string[] {
  const ids = new Set<string>()

  // From Walli's memory.json
  try {
    const mem = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server/memory.json'), 'utf-8'))
    for (const [key, id] of Object.entries(mem?.databases ?? {})) {
      if (typeof id === 'string' &&
          (key.toLowerCase().includes('task') || key.toLowerCase().includes('todo'))) {
        ids.add(id)
      }
    }
  } catch { /* memory.json may not exist */ }

  // From widgets on the active board
  const widgets = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)?.widgets ?? []
  for (const w of widgets) {
    if (w.type === '@whiteboard/notion-view' && w.settings?.databaseId &&
        (w.settings.template === 'todo-list' || w.settings.template === 'kanban')) {
      ids.add(w.settings.databaseId)
    }
  }

  return [...ids]
}

function extractTitle(props: any): string {
  const titleProp = Object.values(props as Record<string, any>)
    .find((p: any) => p.type === 'title') as any
  return titleProp?.title?.map((t: any) => t.plain_text).join('') ?? ''
}
