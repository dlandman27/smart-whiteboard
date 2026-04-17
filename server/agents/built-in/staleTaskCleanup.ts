import type { Agent, AgentContext } from '../types.js'

// Fires once per week (Monday morning)
let lastFiredWeek = -1

export const staleTaskCleanupAgent: Agent = {
  id:          'stale-task-cleanup',
  name:        'Stale Task Cleanup',
  description: 'Every Monday, finds Notion tasks not updated in 14+ days and notifies you to review them.',
  icon:        '🧹',
  intervalMs:  60 * 60_000,  // check hourly
  enabled:     true,

  async run(ctx: AgentContext, _extra?: { reminderText?: string }) {
    const now  = new Date()
    const day  = now.getDay()   // 1 = Monday
    const week = getWeekNumber(now)

    if (day !== 1)              return
    if (lastFiredWeek === week) return
    lastFiredWeek = week

    const widgets = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)?.widgets ?? []
    const taskDbs = [...new Set(
      widgets
        .filter((w: any) => w.type === '@whiteboard/notion-view' &&
          (w.settings?.template === 'todo-list' || w.settings?.template === 'kanban'))
        .map((w: any) => w.settings?.databaseId)
        .filter(Boolean)
    )] as string[]

    const cutoff  = new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString()
    const stale: string[] = []

    for (const dbId of taskDbs) {
      try {
        const result = await (ctx.notion.databases.query as any)({
          database_id: dbId,
          filter: {
            and: [
              { property: 'Status', status: { does_not_equal: 'Done' } },
              { timestamp: 'last_edited_time', last_edited_time: { before: cutoff } },
            ],
          },
          page_size: 10,
        })
        for (const page of (result.results as any[])) {
          const title = Object.values(page.properties as Record<string, any>)
            .find((p: any) => p.type === 'title') as any
          const name = title?.title?.map((t: any) => t.plain_text).join('') ?? ''
          if (name) stale.push(name)
        }
      } catch { /* skip */ }
    }

    if (stale.length === 0) return

    const body = stale.slice(0, 5).map((n) => `• ${n}`).join('\n') +
      (stale.length > 5 ? `\n…and ${stale.length - 5} more` : '')

    ctx.speak(`You have ${stale.length} stale task${stale.length > 1 ? 's' : ''} that haven't been touched in two weeks.`)
    await ctx.notify('Stale tasks', body, { priority: 'default', tags: ['task', 'cleanup'] })
  },
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
