import { google } from 'googleapis'
import type { Agent, AgentContext } from '../types.js'

// ── State ─────────────────────────────────────────────────────────────────────

const alertedEventIds = new Set<string>()

// ── Agent ─────────────────────────────────────────────────────────────────────

export const calendarAgent: Agent = {
  id:          'calendar-agent',
  name:        'Calendar Agent',
  description: 'Warns about calendar events starting in the next 10 minutes.',
  icon:        '📅',
  intervalMs:  5 * 60_000,  // every 5 minutes
  enabled:     true,

  async run(ctx: AgentContext, _extra?: { reminderText?: string }) {
    if (!ctx.gcal) return  // GCal not configured

    const calendar = google.calendar({ version: 'v3', auth: ctx.gcal })
    const now      = new Date()
    const soon     = new Date(now.getTime() + 10 * 60_000)

    let events: any[]
    try {
      const res = await calendar.events.list({
        calendarId:   'primary',
        timeMin:      now.toISOString(),
        timeMax:      soon.toISOString(),
        singleEvents: true,
        orderBy:      'startTime',
        maxResults:   5,
      })
      events = res.data.items ?? []
    } catch {
      return  // GCal auth may be expired — fail silently
    }

    for (const event of events) {
      if (!event.id || alertedEventIds.has(event.id)) continue
      alertedEventIds.add(event.id)

      const title     = event.summary ?? 'an event'
      const startTime = event.start?.dateTime ?? event.start?.date
      if (!startTime) continue

      const minutesUntil = Math.round((new Date(startTime).getTime() - now.getTime()) / 60_000)
      const timeStr = minutesUntil <= 1
        ? 'starting now'
        : `in ${minutesUntil} minute${minutesUntil === 1 ? '' : 's'}`

      ctx.speak(`Heads up — ${title} is ${timeStr}.`)
      ctx.broadcast({
        type:  'agent_notification',
        title: `Meeting ${timeStr}`,
        body:  title,
      })
      await ctx.notify(`📅 ${title}`, `Starting ${timeStr}`, { priority: 'high', tags: ['calendar'] })
    }

    // Clean up old event IDs so we don't grow forever
    // (events more than 1 hour old are safe to forget)
    if (alertedEventIds.size > 100) alertedEventIds.clear()
  },
}
