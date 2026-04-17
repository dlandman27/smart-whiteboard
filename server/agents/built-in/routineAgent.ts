import type { Agent, AgentContext } from '../types.js'

const TRIGGER_HOURS: Record<number, string> = { 6: 'morning', 12: 'daily', 18: 'evening' }

export const routineAgent: Agent = {
  id:          'routine-agent',
  name:        'Routine Agent',
  description: 'Checks your routines at the start of each period and reports how many are done.',
  icon:        '🔁',
  intervalMs:  10 * 60_000,
  enabled:     true,

  async run(ctx: AgentContext, _extra?: { reminderText?: string }) {
    const hour  = new Date().getHours()
    const label = TRIGGER_HOURS[hour]
    if (!label) return

    const port = Number(process.env.PORT) || 3001
    const today = new Date().toISOString().slice(0, 10)

    const [routinesRes, completionsRes] = await Promise.all([
      fetch(`http://localhost:${port}/api/routines`),
      fetch(`http://localhost:${port}/api/routines/completions?date=${today}`),
    ])

    if (!routinesRes.ok || !completionsRes.ok) return

    const routines:     any[]   = await routinesRes.json()
    const completedIds: string[] = await completionsRes.json()

    const periodRoutines = routines.filter((r: any) => r.category === label)
    if (periodRoutines.length === 0) return

    const done  = periodRoutines.filter((r: any) => completedIds.includes(r.id)).length
    const total = periodRoutines.length

    if (done === total) {
      ctx.speak(`All ${label} routines done — great work!`)
    } else {
      const remaining = total - done
      const names = periodRoutines
        .filter((r: any) => !completedIds.includes(r.id))
        .slice(0, 3)
        .map((r: any) => r.title)
        .join(', ')
      ctx.speak(`${done} of ${total} ${label} routines done. Still to go: ${names}${remaining > 3 ? ' and more' : ''}.`)
    }
  },
}
