import { google } from 'googleapis'
import type { VoiceTool } from './_types.js'

export const calendarTools: VoiceTool[] = [
  {
    definition: {
      name:        'list_calendar_events',
      description: "List the user's Google Calendar events. Use for any question about their schedule, meetings, what's happening today/tomorrow/this week, or when something is.",
      input_schema: {
        type: 'object' as const,
        properties: {
          date:       { type: 'string', description: 'ISO date (YYYY-MM-DD) to start from. Defaults to today.' },
          days:       { type: 'number', description: 'Number of days to look ahead (1–7). Default: 1.' },
          calendarId: { type: 'string', description: 'Calendar ID. Default: "primary".' },
        },
      },
    },
    execute: async (input, { gcal }) => {
      if (!gcal) return 'Google Calendar is not connected. Connect it via the Connectors panel.'

      const { date, days = 1, calendarId = 'primary' } = input as {
        date?: string; days?: number; calendarId?: string
      }

      const start = date ? new Date(date) : new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + Math.min(days, 7))

      const cal = google.calendar({ version: 'v3', auth: gcal })
      let items: any[]
      try {
        const res = await cal.events.list({
          calendarId,
          timeMin:      start.toISOString(),
          timeMax:      end.toISOString(),
          singleEvents: true,
          orderBy:      'startTime',
          maxResults:   20,
        })
        items = res.data.items ?? []
      } catch {
        return 'Could not fetch calendar events — your Google Calendar auth may have expired. Try reconnecting via Connectors.'
      }

      if (items.length === 0) return 'No events found for that period.'

      return items.map((e) => {
        const startVal = e.start?.dateTime ?? e.start?.date
        const timeStr  = e.start?.dateTime
          ? new Date(startVal!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'all day'
        const loc = e.location ? ` @ ${e.location}` : ''
        return `${timeStr}: ${e.summary ?? '(no title)'}${loc} [id:${e.id}]`
      }).join('\n')
    },
  },

  {
    definition: {
      name:        'create_calendar_event',
      description: 'Create a new Google Calendar event.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:       { type: 'string', description: 'Event title.' },
          start:       { type: 'string', description: 'Start time in ISO 8601 (e.g. "2025-01-15T14:00:00").' },
          end:         { type: 'string', description: 'End time in ISO 8601. Defaults to 1 hour after start.' },
          description: { type: 'string', description: 'Optional event description.' },
          location:    { type: 'string', description: 'Optional location.' },
          calendarId:  { type: 'string', description: 'Calendar ID. Default: "primary".' },
        },
        required: ['title', 'start'],
      },
    },
    execute: async (input, { gcal }) => {
      if (!gcal) return 'Google Calendar is not connected.'

      const { title, start, end, description, location, calendarId = 'primary' } = input as {
        title: string; start: string; end?: string; description?: string; location?: string; calendarId?: string
      }

      const startDt = new Date(start)
      const endDt   = end ? new Date(end) : new Date(startDt.getTime() + 60 * 60_000)

      const cal = google.calendar({ version: 'v3', auth: gcal })
      try {
        const res = await cal.events.insert({
          calendarId,
          requestBody: {
            summary:     title,
            description: description ?? undefined,
            location:    location ?? undefined,
            start: { dateTime: startDt.toISOString() },
            end:   { dateTime: endDt.toISOString() },
          },
        })
        const when = startDt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const time = startDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return `Created "${res.data.summary}" — ${when} at ${time}`
      } catch {
        return 'Failed to create the event. Your Google Calendar auth may have expired.'
      }
    },
  },

  {
    definition: {
      name:        'delete_calendar_event',
      description: 'Delete a Google Calendar event by its ID. Use list_calendar_events first to find the ID.',
      input_schema: {
        type: 'object' as const,
        properties: {
          eventId:    { type: 'string', description: 'The event ID to delete (from list_calendar_events output).' },
          calendarId: { type: 'string', description: 'Calendar ID. Default: "primary".' },
        },
        required: ['eventId'],
      },
    },
    execute: async (input, { gcal }) => {
      if (!gcal) return 'Google Calendar is not connected.'

      const { eventId, calendarId = 'primary' } = input as { eventId: string; calendarId?: string }
      const cal = google.calendar({ version: 'v3', auth: gcal })
      try {
        await cal.events.delete({ calendarId, eventId })
        return 'Event deleted.'
      } catch {
        return 'Failed to delete the event.'
      }
    },
  },
]
