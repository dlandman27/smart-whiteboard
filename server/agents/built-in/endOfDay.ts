import type { Agent, AgentContext } from '../types.js'

// Only fires once per day
let lastFiredDate = ''

export const endOfDayAgent: Agent = {
  id:          'end-of-day',
  name:        'End of Day Wrap',
  description: 'At 6 PM on weekdays, checks open Notion tasks and speaks a closing summary.',
  icon:        '🌇',
  intervalMs:  10 * 60_000,  // check every 10 minutes
  enabled:     true,

  async run(ctx: AgentContext) {
    const now   = new Date()
    const day   = now.getDay()
    const hour  = now.getHours()
    const today = now.toDateString()

    // Weekdays only, fire between 18:00–18:10
    if (day === 0 || day === 6) return
    if (hour !== 18)            return
    if (lastFiredDate === today) return
    lastFiredDate = today

    // Find open tasks from any tasks widget on the board
    const widgets = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)?.widgets ?? []
    const taskDbs = [...new Set(
      widgets
        .filter((w: any) => w.type === '@whiteboard/notion-view' &&
          (w.settings?.template === 'todo-list' || w.settings?.template === 'kanban'))
        .map((w: any) => w.settings?.databaseId)
        .filter(Boolean)
    )] as string[]

    let openCount = 0
    const openNames: string[] = []

    for (const dbId of taskDbs) {
      try {
        const result = await (ctx.notion.databases.query as any)({
          database_id: dbId,
          filter: { property: 'Status', status: { does_not_equal: 'Done' } },
          page_size: 10,
        })
        for (const page of (result.results as any[])) {
          const title = Object.values(page.properties as Record<string, any>)
            .find((p: any) => p.type === 'title') as any
          const name = title?.title?.map((t: any) => t.plain_text).join('') ?? ''
          if (name) { openNames.push(name); openCount++ }
        }
      } catch { /* skip */ }
    }

    const response = await ctx.anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system:     'You are Walli, a smart whiteboard assistant. Write a short spoken end-of-day message (max 20 words). No markdown.',
      messages:   [{
        role:    'user',
        content: openCount > 0
          ? `It is 6 PM. Open tasks: ${openNames.slice(0, 5).join(', ')}${openCount > 5 ? ` and ${openCount - 5} more` : ''}.`
          : 'It is 6 PM. All tasks are done.',
      }],
    })

    const text = ((response.content[0] as any).text ?? '').trim()
    if (text) {
      ctx.speak(text)
      await ctx.notify(
        'End of day',
        openCount > 0 ? `${openCount} tasks still open` : 'All clear!',
        { priority: 'default', tags: ['summary'] }
      )
    }
  },
}
