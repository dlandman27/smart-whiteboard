import type { Agent, AgentContext } from '../types.js'

// ── Time periods ──────────────────────────────────────────────────────────────

type Period = 'morning' | 'work' | 'evening' | 'night'

function getPeriod(hour: number): Period {
  if (hour >= 5  && hour < 9)  return 'morning'
  if (hour >= 9  && hour < 18) return 'work'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

// ── State ─────────────────────────────────────────────────────────────────────

let lastPeriod: Period | null = null

// ── Agent ─────────────────────────────────────────────────────────────────────

export const focusAgent: Agent = {
  id:          'focus-agent',
  name:        'Focus Agent',
  description: 'Switches to the right board automatically based on time of day.',
  icon:        '🎯',
  intervalMs:  10 * 60_000,  // every 10 minutes
  enabled:     true,

  async run(ctx: AgentContext) {
    const hour   = new Date().getHours()
    const period = getPeriod(hour)

    // No change — nothing to do
    if (period === lastPeriod) return
    const previousPeriod = lastPeriod
    lastPeriod = period

    // Don't act on first run (we don't know what the "last" period was)
    if (previousPeriod === null) return

    // Find a board whose name matches the new period
    const target = ctx.boards.find((b: any) =>
      b.name.toLowerCase().includes(period)
    )
    if (!target || target.id === ctx.activeBoardId) return

    ctx.broadcast({ type: 'switch_board', id: target.id })

    const greetings: Record<Period, string> = {
      morning: 'Good morning! Switching to your morning board.',
      work:    'Time to focus. Switching to your work board.',
      evening: 'Evening! Switching to your evening board.',
      night:   'Winding down. Switching to your night board.',
    }
    ctx.speak(greetings[period])
  },
}
