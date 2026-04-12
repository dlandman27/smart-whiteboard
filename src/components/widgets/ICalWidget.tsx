import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, Icon } from '@whiteboard/ui-kit'
import { apiFetch } from '../../lib/apiFetch'

export interface ICalSettings {
  feedUrl:      string
  feedName?:    string
  days:         number
  showLocation: boolean
  showAllDay:   boolean
}

export const DEFAULT_ICAL_SETTINGS: ICalSettings = {
  feedUrl:      '',
  feedName:     '',
  days:         7,
  showLocation: true,
  showAllDay:   true,
}

interface ICalEvent {
  uid:          string
  title:        string
  start:        string
  end?:         string
  location?:    string
  description?: string
  allDay:       boolean
}

interface ICalData {
  calendarName: string
  events:       ICalEvent[]
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dayLabel(d: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, tomorrow)) return 'Tomorrow'

  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function isOngoing(event: ICalEvent): boolean {
  const now = Date.now()
  const start = new Date(event.start).getTime()
  const end = event.end ? new Date(event.end).getTime() : start
  return start <= now && now <= end
}

// ── Widget ───────────────────────────────────────────────────────────────────

export function ICalWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container className="flex flex-col overflow-hidden" style={{ background: 'var(--wt-bg)', borderRadius: 'inherit' }}>
      <ICalContent widgetId={widgetId} />
    </Container>
  )
}

function ICalContent({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<ICalSettings>(widgetId, DEFAULT_ICAL_SETTINGS)
  const [data, setData]       = useState<ICalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!settings.feedUrl) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ url: settings.feedUrl, days: String(settings.days) })
      const result = await apiFetch<ICalData>(`/api/ical/events?${params}`)
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [settings.feedUrl, settings.days])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!settings.feedUrl) return
    const id = setInterval(fetchEvents, 5 * 60_000)
    return () => clearInterval(id)
  }, [fetchEvents, settings.feedUrl])

  // Filter and group events
  const grouped = useMemo(() => {
    if (!data?.events) return []
    let events = data.events
    if (!settings.showAllDay) {
      events = events.filter((e) => !e.allDay)
    }

    const groups = new Map<string, ICalEvent[]>()
    for (const event of events) {
      const dayKey = startOfDay(new Date(event.start)).toISOString()
      const existing = groups.get(dayKey) || []
      existing.push(event)
      groups.set(dayKey, existing)
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, dayEvents]) => ({
        date: new Date(dayKey),
        label: dayLabel(new Date(dayKey)),
        events: dayEvents,
      }))
  }, [data, settings.showAllDay])

  // No feed URL configured
  if (!settings.feedUrl) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="CalendarBlank" size={28} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center">
            Add a calendar feed URL in settings
          </Text>
        </div>
      </Center>
    )
  }

  if (loading && !data) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading calendar...</Text>
      </Center>
    )
  }

  if (error && !data) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">{error}</Text>
      </Center>
    )
  }

  if (grouped.length === 0) {
    return (
      <Center fullHeight>
        <div className="text-center">
          <Icon icon="CalendarBlank" size={24} style={{ marginBottom: 6, color: 'var(--wt-text-muted)', opacity: 0.5 }} />
          <Text variant="body" size="small" color="muted">No upcoming events</Text>
        </div>
      </Center>
    )
  }

  const displayName = settings.feedName || data?.calendarName || 'Calendar'

  return (
    <div className="flex flex-col h-full p-3 gap-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 px-1 flex-shrink-0">
        <Icon icon="CalendarBlank" size={14} style={{ color: '#0078d4' }} />
        <span
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--wt-text)' }}
        >
          {displayName}
        </span>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {grouped.map((group) => (
          <div key={group.label}>
            {/* Day header */}
            <div
              className="text-xs font-semibold px-1 pt-2.5 pb-1 sticky top-0"
              style={{
                color: group.label === 'Today' ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                background: 'var(--wt-bg)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {group.label}
            </div>

            {/* Events for this day */}
            {group.events.map((event, i) => {
              const ongoing = isOngoing(event)
              return (
                <div
                  key={`${event.uid}-${i}`}
                  className="flex gap-2 px-1 py-1.5 rounded-lg"
                  style={{
                    borderBottom: i < group.events.length - 1 ? '1px solid var(--wt-border)' : undefined,
                    background: event.allDay
                      ? 'color-mix(in srgb, var(--wt-accent) 8%, transparent)'
                      : ongoing
                        ? 'color-mix(in srgb, var(--wt-accent) 5%, transparent)'
                        : undefined,
                  }}
                >
                  {/* Time column */}
                  <div
                    className="flex-shrink-0 text-right"
                    style={{ width: 56, paddingTop: 1 }}
                  >
                    {event.allDay ? (
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--wt-accent)', fontSize: 10 }}
                      >
                        All day
                      </span>
                    ) : (
                      <span
                        className="text-xs"
                        style={{
                          color: ongoing ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                          fontSize: 10,
                          fontWeight: ongoing ? 600 : 400,
                        }}
                      >
                        {formatTime(event.start)}
                      </span>
                    )}
                  </div>

                  {/* Color bar */}
                  <div
                    className="w-0.5 rounded-full flex-shrink-0 self-stretch"
                    style={{
                      background: ongoing ? 'var(--wt-accent)' : 'var(--wt-border)',
                      minHeight: 14,
                    }}
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-medium leading-snug truncate"
                      style={{
                        color: ongoing ? 'var(--wt-accent)' : 'var(--wt-text)',
                      }}
                    >
                      {event.title}
                    </div>
                    {settings.showLocation && event.location && (
                      <div
                        className="text-xs leading-snug truncate mt-0.5"
                        style={{ color: 'var(--wt-text-muted)', fontSize: 10, opacity: 0.7 }}
                      >
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
