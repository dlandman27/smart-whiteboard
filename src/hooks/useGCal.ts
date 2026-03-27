import { useQuery } from '@tanstack/react-query'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

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
    enabled: false,
  })
}

export async function startGCalAuth(clientId: string, clientSecret: string, redirectUri: string): Promise<string> {
  const res = await fetch('/api/gcal/start-auth', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId, clientSecret, redirectUri }),
  })
  if (!res.ok) throw new Error('Failed to start auth')
  const { url } = await res.json()
  return url
}

export function useGCalCalendars() {
  return useQuery({
    queryKey: ['gcal-calendars'],
    queryFn: () => apiFetch<{ items: GCalCalendar[] }>('/api/gcal/calendars'),
    enabled: false,
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
