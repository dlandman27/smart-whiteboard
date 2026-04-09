import { useState, useEffect } from 'react'
import { FlexRow, FlexCol, Text, Icon, ScrollArea } from '@whiteboard/ui-kit'
import {
  useGCalStatus, useGCalCalendars, useAllCalendarEvents,
  type GCalEvent, type GCalCalendar,
} from '../hooks/useGCal'

// ── Color helpers ─────────────────────────────────────────────────────────────

const GCAL_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#3f51b5',
  '9': '#0b8043', '10': '#d50000', '11': '#616161',
}
const DEFAULT_COLOR = '#4285f4'

function eventColor(e: GCalEvent, calColors: Record<string, string> = {}): string {
  if (e.colorId) return GCAL_COLORS[e.colorId] ?? DEFAULT_COLOR
  if (e._calendarId && calColors[e._calendarId]) return calColors[e._calendarId]
  return DEFAULT_COLOR
}

// ── Time formatters ───────────────────────────────────────────────────────────

function fmtTime(dt: string): string {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtTimeRange(start: string, end: string): string {
  return `${fmtTime(start)} – ${fmtTime(end)}`
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  if (totalMin < 60) return `in ${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`
}

function fmtRemaining(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000)
  if (totalMin < 60) return `${totalMin} min remaining`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m remaining` : `${h}h remaining`
}

// ── Main component ────────────────────────────────────────────────────────────

export function TodayBoardView() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: gcalStatus } = useGCalStatus()
  const { data: calendarsData } = useGCalCalendars()

  // Date range: today 00:00 to tomorrow 23:59
  const timeMin = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString() })()
  const timeMax = (() => {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(23,59,59,999); return d.toISOString()
  })()

  const calendarIds: string[] = (calendarsData?.items ?? []).map((c: GCalCalendar) => c.id)

  const { data: allEvents } = useAllCalendarEvents(
    timeMin,
    timeMax,
    gcalStatus?.connected && calendarIds.length > 0 ? calendarIds : [],
  )

  // Build color map from calendars
  const calColors: Record<string, string> = {}
  for (const cal of calendarsData?.items ?? []) {
    if (cal.backgroundColor) calColors[cal.id] = cal.backgroundColor
  }

  // Filter to timed events, sort by start
  const timedEvents: GCalEvent[] = (allEvents ?? [])
    .filter((e) => !!e.start.dateTime)
    .sort((a, b) => new Date(a.start.dateTime!).getTime() - new Date(b.start.dateTime!).getTime())

  // Categorise events relative to now
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999)
  const tomorrowStart = new Date(now); tomorrowStart.setDate(now.getDate()+1); tomorrowStart.setHours(0,0,0,0)
  const tomorrowEnd   = new Date(tomorrowStart); tomorrowEnd.setHours(23,59,59,999)

  const currentEvent = timedEvents.find((e) => {
    const s = new Date(e.start.dateTime!)
    const en = new Date(e.end.dateTime!)
    return s <= now && now <= en
  }) ?? null

  const upNext = timedEvents.find((e) => {
    const s = new Date(e.start.dateTime!)
    return s > now && s <= todayEnd
  }) ?? null

  const upNextEnd = upNext ? new Date(upNext.end.dateTime!) : null

  const laterToday = timedEvents.filter((e) => {
    const s = new Date(e.start.dateTime!)
    const afterBoundary = upNextEnd ? s >= upNextEnd : s > now
    return afterBoundary && s <= todayEnd && e !== upNext
  })

  const tomorrowEvents = timedEvents.filter((e) => {
    const s = new Date(e.start.dateTime!)
    return s >= tomorrowStart && s <= tomorrowEnd
  })

  // Clock display
  const clockStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Not-connected state
  if (!gcalStatus?.connected) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--wt-bg)' }}>
        <div className="flex flex-col items-center gap-3 text-center px-8" style={{ maxWidth: 360 }}>
          <Icon icon="CalendarBlank" size={40} style={{ opacity: 0.3, color: 'var(--wt-text)' }} />
          <Text size="small" style={{ color: 'var(--wt-text-muted)', lineHeight: 1.6 }}>
            Connect Google Calendar in Connectors to see your schedule
          </Text>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--wt-bg)' }}>

      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-8"
        style={{ height: 64, borderBottom: '1px solid var(--wt-border)' }}
      >
        <Text size="small" style={{ color: 'var(--wt-text)', opacity: 0.7, fontWeight: 500 }}>
          {dateStr}
        </Text>
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: 'var(--wt-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {clockStr}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex gap-0 min-h-0">

        {/* Left column — Now & Next */}
        <div className="flex flex-col gap-4 p-6 overflow-y-auto" style={{ flex: '0 0 420px', minWidth: 0 }}>

          <SectionLabel>Now</SectionLabel>

          {currentEvent ? (
            <NowCard event={currentEvent} now={now} calColors={calColors} />
          ) : (
            <div
              className="rounded-xl px-5 py-4 flex items-center gap-3"
              style={{ background: 'var(--wt-surface)', border: '1px solid var(--wt-border)' }}
            >
              <Icon icon="Coffee" size={18} style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} />
              <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.6 }}>
                Nothing happening right now
              </Text>
            </div>
          )}

          {upNext && (
            <>
              <SectionLabel>Up Next</SectionLabel>
              <UpNextCard event={upNext} now={now} calColors={calColors} />
            </>
          )}

        </div>

        {/* Divider */}
        <div className="flex-shrink-0 self-stretch" style={{ width: 1, background: 'var(--wt-border)', margin: '16px 0' }} />

        {/* Right column — Schedule */}
        <ScrollArea className="flex-1 min-w-0">
          <div className="flex flex-col gap-6 p-6">

            <div>
              <SectionLabel>Later Today</SectionLabel>
              <div className="mt-3 flex flex-col gap-1">
                {laterToday.length === 0 ? (
                  <FlexRow gap="xs" className="py-2">
                    <Icon icon="Check" size={14} style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} />
                    <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.55 }}>
                      Free for the rest of the day
                    </Text>
                  </FlexRow>
                ) : (
                  laterToday.map((e) => (
                    <EventRow key={e.id} event={e} calColors={calColors} />
                  ))
                )}
              </div>
            </div>

            <div>
              <SectionLabel>Tomorrow</SectionLabel>
              <div className="mt-3 flex flex-col gap-1">
                {tomorrowEvents.length === 0 ? (
                  <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.45 }} className="py-2">
                    Nothing scheduled
                  </Text>
                ) : (
                  <>
                    {tomorrowEvents.slice(0, 5).map((e) => (
                      <EventRow key={e.id} event={e} calColors={calColors} />
                    ))}
                    {tomorrowEvents.length > 5 && (
                      <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} className="pt-1 pl-5">
                        +{tomorrowEvents.length - 5} more
                      </Text>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>
        </ScrollArea>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--wt-text-muted)',
        opacity: 0.6,
      }}
    >
      {children}
    </span>
  )
}

function NowCard({ event, now, calColors }: { event: GCalEvent; now: Date; calColors: Record<string, string> }) {
  const color    = eventColor(event, calColors)
  const startMs  = new Date(event.start.dateTime!).getTime()
  const endMs    = new Date(event.end.dateTime!).getTime()
  const duration = endMs - startMs
  const elapsed  = now.getTime() - startMs
  const pct      = Math.min(100, Math.max(0, (elapsed / duration) * 100))
  const remaining = endMs - now.getTime()

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--wt-surface))`,
        border: '1px solid var(--wt-border)',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="px-5 pt-4 pb-3">
        <Text
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--wt-text)',
            lineHeight: 1.2,
            display: 'block',
            marginBottom: 4,
          }}
        >
          {event.summary ?? '(No title)'}
        </Text>
        <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.7 }}>
          {fmtTimeRange(event.start.dateTime!, event.end.dateTime!)}
        </Text>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-2">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, background: 'color-mix(in srgb, var(--wt-text) 10%, transparent)' }}
        >
          <div
            style={{
              width:      `${pct}%`,
              height:     '100%',
              background: `color-mix(in srgb, ${color} 70%, transparent)`,
              transition: 'width 1s linear',
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      <div className="px-5 pb-4">
        <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.55 }}>
          {fmtRemaining(remaining)}
        </Text>
      </div>
    </div>
  )
}

function UpNextCard({ event, now, calColors }: { event: GCalEvent; now: Date; calColors: Record<string, string> }) {
  const color   = eventColor(event, calColors)
  const startMs = new Date(event.start.dateTime!).getTime()
  const diff    = startMs - now.getTime()

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'var(--wt-surface)',
        border: '1px solid var(--wt-border)',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="px-5 py-4">
        <Text
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--wt-text)',
            lineHeight: 1.3,
            display: 'block',
            marginBottom: 4,
          }}
        >
          {event.summary ?? '(No title)'}
        </Text>
        <FlexRow gap="sm" style={{ alignItems: 'center' }}>
          <Text size="small" style={{ color: 'var(--wt-text-muted)', opacity: 0.65 }}>
            {fmtTimeRange(event.start.dateTime!, event.end.dateTime!)}
          </Text>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--wt-text-muted)', opacity: 0.4 }} />
          <Text size="small" style={{ color, fontWeight: 600 }}>
            {fmtCountdown(diff)}
          </Text>
        </FlexRow>
      </div>
    </div>
  )
}

function EventRow({ event, calColors }: { event: GCalEvent; calColors: Record<string, string> }) {
  const color = eventColor(event, calColors)
  return (
    <FlexRow
      gap="sm"
      style={{ alignItems: 'center', padding: '5px 4px', borderRadius: 8 }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          marginLeft: 2,
        }}
      />
      <Text
        size="small"
        style={{ color: 'var(--wt-text-muted)', opacity: 0.6, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtTime(event.start.dateTime!)}
      </Text>
      <Text
        size="small"
        style={{ color: 'var(--wt-text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {event.summary ?? '(No title)'}
      </Text>
    </FlexRow>
  )
}
