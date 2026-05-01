import { apiFetch } from '../../lib/apiFetch'
import type { EventProvider } from '../types'
import type { UnifiedEvent, SourceGroup } from '../../types/unified'

interface ICalFeed {
  id: string
  name: string
  url: string
  color?: string
}

interface ICalEventRaw {
  uid: string
  title: string
  start: string
  end?: string
  location?: string
  description?: string
  allDay: boolean
}

export class ICalProvider implements EventProvider {
  id = 'ical'
  label = 'iCal / Apple Calendar'
  icon = 'CalendarBlank'

  private _connected = false
  private _checkedStatus = false
  private _feedsCache: ICalFeed[] | null = null
  private _feedsCacheTime = 0

  isConnected(): boolean {
    if (!this._checkedStatus) this._checkStatus()
    return this._connected
  }

  private async _checkStatus(): Promise<void> {
    try {
      const feeds = await this._getFeeds()
      this._connected = feeds.length > 0
    } catch {
      this._connected = false
    }
    this._checkedStatus = true
  }

  private async _getFeeds(): Promise<ICalFeed[]> {
    if (this._feedsCache && Date.now() - this._feedsCacheTime < 2 * 60_000) {
      return this._feedsCache
    }
    try {
      const data = await apiFetch<{ feeds: ICalFeed[] }>('/api/ical-feeds')
      this._feedsCache = data.feeds ?? []
    } catch {
      this._feedsCache = []
    }
    this._feedsCacheTime = Date.now()
    return this._feedsCache!
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const feeds = await this._getFeeds()
    return feeds.map((f) => ({
      provider:  'ical',
      groupName: f.name,
      color:     f.color ?? undefined,
    }))
  }

  async fetchEvents(timeMin: string, timeMax: string): Promise<UnifiedEvent[]> {
    const feeds = await this._getFeeds()
    if (!feeds.length) return []

    // Calculate days between timeMin and timeMax for the ical endpoint
    const ms = new Date(timeMax).getTime() - new Date(timeMin).getTime()
    const days = Math.max(1, Math.min(30, Math.ceil(ms / 86400_000)))

    const results = await Promise.allSettled(
      feeds.map((feed) =>
        apiFetch<{ calendarName: string; events: ICalEventRaw[] }>(
          `/api/ical/events?url=${encodeURIComponent(feed.url)}&days=${days}`
        ).then((data) =>
          (data.events ?? []).map((ev): UnifiedEvent => ({
            source:      { provider: 'ical', id: ev.uid, feedUrl: feed.url },
            title:       ev.title,
            description: ev.description,
            location:    ev.location,
            start:       ev.start,
            end:         ev.end,
            allDay:      ev.allDay,
            groupName:   feed.name,
            groupColor:  feed.color ?? undefined,
            readOnly:    true,
          }))
        )
      )
    )

    return results
      .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
  }
}
