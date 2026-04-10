import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export interface GCalStatus {
  connected: boolean
}

export interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  htmlLink?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
  allDay?: boolean
  // Client-side annotation: which calendar this event came from
  _calendarId?: string
}

export interface GCalCalendar {
  id: string
  summary: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
}

export function useGCalStatus() {
  return useQuery({
    queryKey: ['gcal-status'],
    queryFn: () => apiFetch<GCalStatus>('/api/gcal/status'),
    retry: false,
  })
}

export async function startGCalAuth(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>('/api/gcal/connect', { method: 'POST' })
  return url
}

export async function disconnectGCal(): Promise<void> {
  await apiFetch('/api/gcal/disconnect', { method: 'POST' })
}

export function useGCalCalendars() {
  return useQuery({
    queryKey: ['gcal-calendars'],
    queryFn: () => apiFetch<{ items: GCalCalendar[] }>('/api/gcal/calendars'),
    retry: false,
  })
}

export function useGCalEvents(timeMin: string, timeMax: string, calendarId = 'primary') {
  return useQuery({
    queryKey: ['gcal-events', calendarId, timeMin, timeMax],
    queryFn: () =>
      apiFetch<{ items: GCalEvent[] }>(
        `/api/gcal/events?calendarId=${encodeURIComponent(calendarId)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      ),
    enabled: !!(timeMin && timeMax),
    refetchInterval: 5 * 60_000,
  })
}

// Fetches events from multiple calendars in parallel and merges them.
// Each event is annotated with _calendarId so colors can be applied.
export function useAllCalendarEvents(timeMin: string, timeMax: string, calendarIds: string[]) {
  const key = [...calendarIds].sort().join(',')
  return useQuery({
    queryKey: ['gcal-events-all', key, timeMin, timeMax],
    queryFn: async () => {
      const results = await Promise.all(
        calendarIds.map(id =>
          apiFetch<{ items: GCalEvent[] }>(
            `/api/gcal/events?calendarId=${encodeURIComponent(id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
          ).then(data => (data.items ?? []).map(ev => ({ ...ev, _calendarId: id })))
        )
      )
      return results.flat()
    },
    enabled: calendarIds.length > 0 && !!(timeMin && timeMax),
    refetchInterval: 5 * 60_000,
  })
}

export async function createGCalEvent(
  calendarId: string,
  event: {
    summary:      string
    description?: string
    start:        { dateTime?: string; date?: string; timeZone?: string }
    end:          { dateTime?: string; date?: string; timeZone?: string }
  }
): Promise<GCalEvent> {
  return apiFetch<GCalEvent>('/api/gcal/events', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ calendarId, ...event }),
  })
}

export async function deleteGCalEvent(calendarId: string, eventId: string): Promise<void> {
  await apiFetch(`/api/gcal/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  })
}
