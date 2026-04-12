import { apiFetch } from '../../lib/apiFetch'
import type { EventProvider } from '../types'
import type { UnifiedEvent, SourceGroup } from '../../types/unified'

interface GCalCalendar {
  id: string
  summary: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
}

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  htmlLink?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  allDay?: boolean
  _calendarId?: string
}

export class GCalProvider implements EventProvider {
  id = 'gcal'
  label = 'Google Calendar'
  icon = 'GoogleLogo'

  private _connected = false
  private _checkedStatus = false

  isConnected(): boolean {
    if (!this._checkedStatus) {
      this._checkStatus()
    }
    return this._connected
  }

  private async _checkStatus(): Promise<void> {
    try {
      const status = await apiFetch<{ connected: boolean }>('/api/gcal/status')
      this._connected = status.connected
    } catch {
      this._connected = false
    }
    this._checkedStatus = true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const data = await apiFetch<{ items: GCalCalendar[] }>('/api/gcal/calendars')
    return (data.items ?? []).map((cal) => ({
      provider: 'gcal',
      groupName: cal.summary,
      color: cal.backgroundColor,
    }))
  }

  async fetchEvents(timeMin: string, timeMax: string, groupIds?: string[]): Promise<UnifiedEvent[]> {
    const calendars = await apiFetch<{ items: GCalCalendar[] }>('/api/gcal/calendars')
    const allCalendars = calendars.items ?? []

    const targetCalendars = groupIds?.length
      ? allCalendars.filter((c) => groupIds.includes(c.id))
      : allCalendars

    const calMap = new Map(allCalendars.map((c) => [c.id, c]))

    const results = await Promise.all(
      targetCalendars.map((cal) =>
        apiFetch<{ items: GCalEvent[] }>(
          `/api/gcal/events?calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        ).then((data) =>
          (data.items ?? []).map((event): UnifiedEvent => {
            const calendar = calMap.get(cal.id)
            return {
              source: { provider: 'gcal', id: event.id, calendarId: cal.id },
              title: event.summary ?? '(No title)',
              description: event.description,
              location: event.location,
              start: event.start.dateTime ?? event.start.date ?? '',
              end: event.end?.dateTime ?? event.end?.date,
              allDay: !!event.start.date && !event.start.dateTime,
              groupName: calendar?.summary ?? 'Calendar',
              groupColor: calendar?.backgroundColor,
            }
          })
        )
      )
    )

    return results.flat()
  }

  async createEvent(groupId: string, event: { title: string; start: string; end?: string; allDay?: boolean }): Promise<void> {
    const body: Record<string, unknown> = {
      calendarId: groupId,
      summary: event.title,
      start: event.allDay
        ? { date: event.start.split('T')[0] }
        : { dateTime: event.start },
      end: event.end
        ? event.allDay
          ? { date: event.end.split('T')[0] }
          : { dateTime: event.end }
        : event.allDay
          ? { date: event.start.split('T')[0] }
          : { dateTime: event.start },
    }

    await apiFetch('/api/gcal/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async deleteEvent(event: UnifiedEvent): Promise<void> {
    if (event.source.provider !== 'gcal') return
    const { id, calendarId } = event.source
    await apiFetch(`/api/gcal/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }
}
