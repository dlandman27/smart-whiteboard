import type { Agent, AgentContext } from '../types.js'

// Tracks which event IDs we've already warned about this session
const warned = new Set<string>()

export const meetingCountdownAgent: Agent = {
  id:          'meeting-countdown',
  name:        'Meeting Countdown',
  description: 'Speaks a heads-up 10 minutes before any Google Calendar event.',
  icon:        '⏰',
  intervalMs:  2 * 60_000,  // check every 2 minutes
  enabled:     true,

  async run(ctx: AgentContext) {
    if (!ctx.gcal) return

    const now   = new Date()
    const soon  = new Date(now.getTime() + 11 * 60_000)  // next 11 minutes

    let events: any[] = []
    try {
      const result = await ctx.gcal.events.list({
        calendarId:   'primary',
        timeMin:      now.toISOString(),
        timeMax:      soon.toISOString(),
        singleEvents: true,
        orderBy:      'startTime',
        maxResults:   5,
      })
      events = result.data.items ?? []
    } catch {
      return
    }

    for (const event of events) {
      const id        = event.id as string
      const title     = (event.summary as string) ?? 'a meeting'
      const startISO  = event.start?.dateTime ?? event.start?.date
      if (!startISO || warned.has(id)) continue

      const startMs   = new Date(startISO).getTime()
      const minsAway  = Math.round((startMs - now.getTime()) / 60_000)
      if (minsAway < 1 || minsAway > 10) continue

      warned.add(id)
      // Clear the warning after the event so repeat events next time work
      setTimeout(() => warned.delete(id), 30 * 60_000)

      const text = minsAway <= 2
        ? `${title} is starting now.`
        : `${title} starts in ${minsAway} minutes.`

      ctx.speak(text)
      await ctx.notify('Meeting soon', text, { priority: 'high', tags: ['calendar', 'clock'] })
    }
  },
}
