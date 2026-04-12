import { apiFetch } from '../../lib/apiFetch'
import type { EventProvider } from '../types'
import type { UnifiedEvent, SourceGroup } from '../../types/unified'

interface ICalFeed {
  url: string
  name?: string
  color?: string
}

interface ICalEvent {
  uid: string
  title: string
  start: string
  end?: string
  location?: string
  description?: string
  allDay: boolean
}

interface ICalData {
  calendarName: string
  events: ICalEvent[]
}

export class ICalProvider implements EventProvider {
  id = 'ical'
  label = 'iCal Feeds'
  icon = 'CalendarBlank'

  private _feeds: ICalFeed[] = []

  /**
   * Set the list of configured iCal feeds.
   * Call this before fetching events (e.g. from user settings / user_theme.ical_feeds).
   */
  setFeeds(feeds: ICalFeed[]): void {
    this._feeds = feeds
  }

  isConnected(): boolean {
    return this._feeds.length > 0
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    // Each feed is a "group"
    // Optionally fetch the calendar name from the first request, but for now use the configured name
    return this._feeds.map((feed) => ({
      provider: 'ical',
      groupName: feed.name ?? feed.url,
      color: feed.color,
    }))
  }

  async fetchEvents(timeMin: string, timeMax: string, groupIds?: string[]): Promise<UnifiedEvent[]> {
    const feeds = groupIds?.length
      ? this._feeds.filter((f) => groupIds.includes(f.url))
      : this._feeds

    if (feeds.length === 0) return []

    // Calculate days from timeMin to timeMax
    const start = new Date(timeMin)
    const end = new Date(timeMax)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))

    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const params = new URLSearchParams({ url: feed.url, days: String(days) })
          const data = await apiFetch<ICalData>(`/api/ical/events?${params}`)
          const displayName = feed.name ?? data.calendarName ?? feed.url

          return (data.events ?? []).map((event): UnifiedEvent => ({
            source: { provider: 'ical', id: event.uid, feedUrl: feed.url },
            title: event.title,
            description: event.description,
            location: event.location,
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            groupName: displayName,
            groupColor: feed.color,
            readOnly: true,
          }))
        } catch {
          // If a single feed fails, don't break the rest
          return []
        }
      })
    )

    return results.flat()
  }

  // iCal feeds are read-only — no createEvent or deleteEvent
}
