import type { Agent, AgentContext } from '../types.js'

// ── State ─────────────────────────────────────────────────────────────────────

let lastRemindedDate = ''

// ── Agent ─────────────────────────────────────────────────────────────────────

export const routineAgent: Agent = {
  id:          'routine-agent',
  name:        'Routine Agent',
  description: 'Reminds you to start your routines at the beginning of each period.',
  intervalMs:  10 * 60_000,  // every 10 minutes
  enabled:     true,

  async run(ctx: AgentContext) {
    const now    = new Date()
    const hour   = now.getHours()
    const today  = now.toISOString().slice(0, 10)

    // Only prompt at the start of morning (6am), fitness (12pm), evening (6pm)
    const triggerHours = [6, 12, 18]
    if (!triggerHours.includes(hour)) return

    const key = `${today}-${hour}`
    if (lastRemindedDate === key) return
    lastRemindedDate = key

    // Find a routines widget on the active board
    const widgets = ctx.boards.find((b: any) => b.id === ctx.activeBoardId)?.widgets ?? []
    const routineWidget = widgets.find((w: any) => w.type === '@whiteboard/routines')
    if (!routineWidget) return

    const periodLabel = hour === 6 ? 'morning' : hour === 12 ? 'fitness' : 'evening'
    ctx.speak(`Time for your ${periodLabel} routines.`)
    await ctx.notify(`${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} Routines`, `Time to start your ${periodLabel} routines.`, { tags: ['muscle'] })
  },
}
