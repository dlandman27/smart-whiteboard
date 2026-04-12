import { apiFetch } from '../../lib/apiFetch'
import type { EventProvider } from '../types'
import type { UnifiedEvent, SourceGroup } from '../../types/unified'

interface BuiltinCalendar {
  id: string
  name: string
  color?: string
}

interface BuiltinEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: string
  end?: string
  allDay: boolean
  calendar_id: string
}

export class BuiltinEventProvider implements EventProvider {
  id = 'builtin'
  label = 'Built-in Calendar'
  icon = 'CalendarBlank'

  isConnected(): boolean {
    return true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const calendars = await apiFetch<BuiltinCalendar[]>('/api/events/calendars')
    return calendars.map((cal) => ({
      provider: 'builtin',
      groupName: cal.name,
      color: cal.color,
    }))
  }

  async fetchEvents(timeMin: string, timeMax: string, groupIds?: string[]): Promise<UnifiedEvent[]> {
    const params = new URLSearchParams({ timeMin, timeMax })
    if (groupIds?.length) {
      params.set('calendarIds', groupIds.join(','))
    }
    const events = await apiFetch<BuiltinEvent[]>(`/api/events?${params}`)

    // Fetch calendars for group name mapping
    const calendars = await apiFetch<BuiltinCalendar[]>('/api/events/calendars')
    const calMap = new Map(calendars.map((c) => [c.id, c]))

    return events.map((event) => {
      const cal = calMap.get(event.calendar_id)
      return {
        source: { provider: 'builtin' as const, id: event.id },
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        groupName: cal?.name ?? 'Calendar',
        groupColor: cal?.color,
      }
    })
  }

  async createEvent(groupId: string, event: { title: string; start: string; end?: string; allDay?: boolean }): Promise<void> {
    await apiFetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendar_id: groupId, ...event }),
    })
  }

  async deleteEvent(event: UnifiedEvent): Promise<void> {
    if (event.source.provider !== 'builtin') return
    await apiFetch(`/api/events/${encodeURIComponent(event.source.id)}`, {
      method: 'DELETE',
    })
  }
}
