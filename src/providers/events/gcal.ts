import { apiFetch } from '../../lib/apiFetch'
import type { EventProvider } from '../types'
import type { UnifiedEvent, SourceGroup } from '../../types/unified'

interface GCalCalendar {
  id: string
  summary: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accountId: string
  accountEmail?: string
}

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
}

interface GCalAccount {
  accountId: string
  email: string
}

export class GCalProvider implements EventProvider {
  id = 'gcal'
  label = 'Google Calendar'
  icon = 'GoogleLogo'

  private _connected = false
  private _checkedStatus = false
  private _calendarsCache: GCalCalendar[] | null = null
  private _calendarsCacheTime = 0

  isConnected(): boolean {
    if (!this._checkedStatus) this._checkStatus()
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

  private async _getAllCalendars(): Promise<GCalCalendar[]> {
    if (this._calendarsCache && Date.now() - this._calendarsCacheTime < 2 * 60_000) {
      return this._calendarsCache
    }
    try {
      const data = await apiFetch<{ items: GCalCalendar[] }>('/api/gcal/calendars')
      this._calendarsCache = data.items ?? []
    } catch {
      this._calendarsCache = []
    }
    this._calendarsCacheTime = Date.now()
    return this._calendarsCache!
  }

  private _accounts: GCalAccount[] | null = null

  private async _getAccounts(): Promise<GCalAccount[]> {
    if (this._accounts) return this._accounts
    try {
      const data = await apiFetch<{ accounts: GCalAccount[] }>('/api/gcal/accounts')
      this._accounts = data.accounts ?? []
    } catch {
      this._accounts = []
    }
    return this._accounts!
  }

  private _calendarLabel(cal: GCalCalendar, allAccounts: GCalAccount[]): string {
    if (allAccounts.length <= 1) return cal.summary
    const email = cal.accountEmail ?? cal.accountId
    return `${cal.summary} (${email})`
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const [calendars, accounts] = await Promise.all([this._getAllCalendars(), this._getAccounts()])
    return calendars.map((cal) => ({
      provider:  'gcal',
      groupName: this._calendarLabel(cal, accounts),
      color:     cal.backgroundColor,
    }))
  }

  async fetchEvents(timeMin: string, timeMax: string, groupIds?: string[]): Promise<UnifiedEvent[]> {
    const [allCalendars, accounts] = await Promise.all([this._getAllCalendars(), this._getAccounts()])

    const targetCalendars = groupIds?.length
      ? allCalendars.filter((c) => groupIds.includes(c.id))
      : allCalendars

    const results = await Promise.allSettled(
      targetCalendars.map((cal) =>
        apiFetch<{ items: GCalEvent[] }>(
          `/api/gcal/events?accountId=${encodeURIComponent(cal.accountId)}&calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        ).then((data) =>
          (data.items ?? []).map((event): UnifiedEvent => ({
            source:     { provider: 'gcal', id: event.id, calendarId: cal.id, accountId: cal.accountId } as any,
            title:      event.summary ?? '(No title)',
            description: event.description,
            location:   event.location,
            start:      event.start.dateTime ?? event.start.date ?? '',
            end:        event.end?.dateTime ?? event.end?.date,
            allDay:     !!event.start.date && !event.start.dateTime,
            groupName:  this._calendarLabel(cal, accounts),
            groupColor: cal.backgroundColor,
          }))
        )
      )
    )

    return results
      .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
  }

  async createEvent(groupId: string, event: { title: string; start: string; end?: string; allDay?: boolean }): Promise<void> {
    // groupId is the calendarId; use primary account (first account)
    const accounts = await this._getAccounts()
    const accountId = accounts[0]?.accountId ?? 'primary'

    const body: Record<string, unknown> = {
      accountId,
      calendarId: groupId,
      summary:    event.title,
      start:      event.allDay ? { date: event.start.split('T')[0] } : { dateTime: event.start },
      end:        event.end
        ? event.allDay ? { date: event.end.split('T')[0] } : { dateTime: event.end }
        : event.allDay ? { date: event.start.split('T')[0] } : { dateTime: event.start },
    }

    await apiFetch('/api/gcal/events', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  }

  async deleteEvent(event: UnifiedEvent): Promise<void> {
    if (event.source.provider !== 'gcal') return
    const { id, calendarId } = event.source as any
    const accountId = (event.source as any).accountId ?? 'primary'
    await apiFetch(`/api/gcal/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(id)}?accountId=${encodeURIComponent(accountId)}`, {
      method: 'DELETE',
    })
  }
}
