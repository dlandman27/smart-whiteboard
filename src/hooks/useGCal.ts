import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export interface GCalStatus {
  connected: boolean
}

export interface GCalAccount {
  accountId: string
  email: string
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
  _calendarId?: string
  _accountId?: string
}

export interface GCalCalendar {
  id: string
  summary: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accountId?: string
  accountEmail?: string
}

export interface ICalFeed {
  id: string
  name: string
  url: string
  color?: string
  created_at: string
}

// ── Google Calendar ───────────────────────────────────────────────────────────

export function useGCalStatus() {
  return useQuery({
    queryKey: ['gcal-status'],
    queryFn: () => apiFetch<GCalStatus>('/api/gcal/status'),
    retry: false,
  })
}

export function useGCalAccounts() {
  return useQuery({
    queryKey: ['gcal-accounts'],
    queryFn: () => apiFetch<{ accounts: GCalAccount[] }>('/api/gcal/accounts'),
    retry: false,
  })
}

export async function startGCalAuth(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>('/api/gcal/connect', { method: 'POST' })
  return url
}

export async function disconnectGCal(accountId?: string): Promise<void> {
  await apiFetch('/api/gcal/disconnect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ accountId }),
  })
}

export function useGCalCalendars(accountId?: string) {
  const url = accountId
    ? `/api/gcal/calendars?accountId=${encodeURIComponent(accountId)}`
    : '/api/gcal/calendars'
  return useQuery({
    queryKey: ['gcal-calendars', accountId ?? 'all'],
    queryFn: () => apiFetch<{ items: GCalCalendar[] }>(url),
    retry: false,
  })
}

export function useGCalEvents(timeMin: string, timeMax: string, calendarId = 'primary', accountId = 'primary') {
  return useQuery({
    queryKey: ['gcal-events', accountId, calendarId, timeMin, timeMax],
    queryFn: () =>
      apiFetch<{ items: GCalEvent[] }>(
        `/api/gcal/events?accountId=${encodeURIComponent(accountId)}&calendarId=${encodeURIComponent(calendarId)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      ),
    enabled: !!(timeMin && timeMax),
    refetchInterval: 5 * 60_000,
  })
}

export function useAllCalendarEvents(timeMin: string, timeMax: string, calendars: { calendarId: string; accountId?: string }[]) {
  const key = calendars.map(c => `${c.accountId ?? 'primary'}:${c.calendarId}`).sort().join(',')
  return useQuery({
    queryKey: ['gcal-events-all', key, timeMin, timeMax],
    queryFn: async () => {
      const results = await Promise.all(
        calendars.map(({ calendarId, accountId = 'primary' }) =>
          apiFetch<{ items: GCalEvent[] }>(
            `/api/gcal/events?accountId=${encodeURIComponent(accountId)}&calendarId=${encodeURIComponent(calendarId)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
          ).then(data => (data.items ?? []).map(ev => ({ ...ev, _calendarId: calendarId, _accountId: accountId })))
        )
      )
      return results.flat()
    },
    enabled: calendars.length > 0 && !!(timeMin && timeMax),
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
  },
  accountId = 'primary',
): Promise<GCalEvent> {
  return apiFetch<GCalEvent>('/api/gcal/events', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ calendarId, accountId, ...event }),
  })
}

export async function deleteGCalEvent(calendarId: string, eventId: string, accountId = 'primary'): Promise<void> {
  await apiFetch(`/api/gcal/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}?accountId=${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  })
}

// ── iCal feeds ────────────────────────────────────────────────────────────────

export function useICalFeeds() {
  return useQuery({
    queryKey: ['ical-feeds'],
    queryFn: () => apiFetch<{ feeds: ICalFeed[] }>('/api/ical-feeds'),
    retry: false,
  })
}

export function useAddICalFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (feed: { name: string; url: string; color?: string }) =>
      apiFetch<ICalFeed>('/api/ical-feeds', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(feed),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ical-feeds'] })
      qc.invalidateQueries({ queryKey: ['unified-events'] })
    },
  })
}

export function useDeleteICalFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/ical-feeds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ical-feeds'] })
      qc.invalidateQueries({ queryKey: ['unified-events'] })
    },
  })
}
