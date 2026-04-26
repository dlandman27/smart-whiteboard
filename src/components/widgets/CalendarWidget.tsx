import { useState } from 'react'
import { IconButton, Text, Button, Icon, SegmentedControl } from '@whiteboard/ui-kit'
import { FlexCol, FlexRow, Box, Grid, Center, ScrollArea } from '@whiteboard/ui-kit'
import { useGCalEvents, useGCalStatus, type GCalEvent } from '../../hooks/useGCal'
import { useWidgetSettings, type WidgetProps } from '@whiteboard/sdk'

// Google Calendar event color map
const GCAL_COLORS: Record<string, string> = {
  '1':  '#7986cb', // Lavender
  '2':  '#33b679', // Sage
  '3':  '#8e24aa', // Grape
  '4':  '#e67c73', // Flamingo
  '5':  '#f6c026', // Banana
  '6':  '#f5511d', // Tangerine
  '7':  '#039be5', // Peacock
  '8':  '#3f51b5', // Blueberry
  '9':  '#0b8043', // Basil
  '10': '#d50000', // Tomato
  '11': '#616161', // Graphite
}
const DEFAULT_COLOR = '#4285f4'

function eventColor(e: GCalEvent): string {
  return e.colorId ? (GCAL_COLORS[e.colorId] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

// ── Date range helpers ────────────────────────────────────────────────────────

function dayRange(d: Date) {
  const s = new Date(d); s.setHours(0, 0, 0, 0)
  const e = new Date(d); e.setHours(23, 59, 59, 999)
  return { timeMin: s.toISOString(), timeMax: e.toISOString() }
}

function weekRange(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const s = new Date(d); s.setDate(d.getDate() + diff); s.setHours(0, 0, 0, 0)
  const e = new Date(s);  e.setDate(s.getDate() + 6);   e.setHours(23, 59, 59, 999)
  return { timeMin: s.toISOString(), timeMax: e.toISOString(), start: s }
}

function monthRange(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1)
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { timeMin: s.toISOString(), timeMax: e.toISOString() }
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            display: 'flex', alignItems: 'stretch', gap: 10,
            paddingTop: 12, paddingBottom: 12,
            paddingLeft: 14, paddingRight: 14,
          }}
        >
          <div style={{
            width: 4, borderRadius: 2,
            background: 'var(--wt-surface-hover)', flexShrink: 0,
            minHeight: 36,
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 15, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '72%' }} />
            <div style={{ height: 13, borderRadius: 6, background: 'var(--wt-surface-hover)', width: '42%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: GCalEvent }) {
  const isAllDay = !event.start.dateTime
  const color    = eventColor(event)
  const start    = isAllDay ? null : formatTime(event.start.dateTime!)
  const end      = isAllDay ? null : formatTime(event.end.dateTime!)
  return (
    <FlexRow
      align="start"
      gap="sm"
      className="wt-row-btn"
      style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 }}
    >
      {/* 4px wide color bar */}
      <div style={{
        width: 4, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0,
        background: color, minHeight: 16, marginTop: 2,
      }} />
      <Box flex1 className="min-w-0">
        <Text
          variant="label"
          size="small"
          className="truncate"
          style={{ lineHeight: '1.3', fontSize: 15 }}
        >
          {event.summary || '(No title)'}
        </Text>
        <Text
          variant="caption"
          size="small"
          color="muted"
          style={{ lineHeight: '1.3', fontSize: 13 }}
        >
          {isAllDay ? 'All day' : `${start} – ${end}`}
        </Text>
      </Box>
    </FlexRow>
  )
}

function DayView({ events }: { events: GCalEvent[] }) {
  const allDay = events.filter(e => !e.start.dateTime)
  const timed  = events.filter(e => !!e.start.dateTime)
  if (events.length === 0) {
    return (
      <Center fullHeight>
        <Text variant="caption" size="large" color="muted" style={{ opacity: 0.5 }}>No events</Text>
      </Center>
    )
  }
  return (
    <FlexCol overflow="y-auto">
      {allDay.map(e => <EventRow key={e.id} event={e} />)}
      {allDay.length > 0 && timed.length > 0 && (
        <Box className="mx-3 my-1" style={{ borderBottom: '1px solid var(--wt-border)' }} />
      )}
      {timed.map(e => <EventRow key={e.id} event={e} />)}
    </FlexCol>
  )
}

function WeekView({ events, weekStart }: { events: GCalEvent[]; weekStart: Date }) {
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <FlexCol overflow="y-auto" className="divide-y divide-[var(--wt-border)]">
      {days.map(day => {
        const s = new Date(day); s.setHours(0, 0, 0, 0)
        const e = new Date(day); e.setHours(23, 59, 59, 999)
        const dayEvents = events.filter(ev => {
          const t = new Date(ev.start.dateTime ?? ev.start.date ?? '')
          return t >= s && t <= e
        })
        const isToday = day.toDateString() === today.toDateString()
        return (
          <FlexRow
            key={day.toISOString()}
            gap="sm"
            className="px-3 py-2"
            style={isToday ? { background: 'var(--wt-surface-hover)' } : undefined}
          >
            <Box className="w-9 flex-shrink-0 text-right pt-0.5">
              <Text
                variant="label"
                size="small"
                color={isToday ? 'accent' : 'muted'}
                align="right"
                style={{ fontWeight: '700', fontSize: 14 }}
              >
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text
                variant="body"
                size="small"
                color={isToday ? 'accent' : 'muted'}
                align="right"
                style={{ fontWeight: '600', lineHeight: '1', fontSize: 16 }}
              >
                {day.getDate()}
              </Text>
            </Box>
            <FlexCol flex1 className="min-w-0 gap-0.5 pt-0.5">
              {dayEvents.length === 0 ? (
                <Text variant="caption" size="small" color="muted" style={{ opacity: 0.4 }}>—</Text>
              ) : (
                dayEvents.map(ev => (
                  <FlexRow key={ev.id} align="center" className="gap-1.5">
                    <span
                      className="rounded-full flex-shrink-0"
                      style={{ width: 6, height: 6, background: eventColor(ev) }}
                    />
                    <Text as="span" variant="caption" size="large" className="truncate flex-1" style={{ fontSize: 14 }}>
                      {ev.summary || '(No title)'}
                    </Text>
                    {ev.start.dateTime && (
                      <Text as="span" variant="caption" size="small" color="muted" className="flex-shrink-0" style={{ fontSize: 12 }}>
                        {formatTime(ev.start.dateTime)}
                      </Text>
                    )}
                  </FlexRow>
                ))
              )}
            </FlexCol>
          </FlexRow>
        )
      })}
    </FlexCol>
  )
}

function MonthView({ events, date }: { events: GCalEvent[]; date: Date }) {
  const year        = date.getFullYear()
  const month       = date.getMonth()
  const firstDay    = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today       = new Date()

  const offset = (firstDay.getDay() + 6) % 7
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dayEvents(day: number) {
    const s = new Date(year, month, day)
    const e = new Date(year, month, day, 23, 59, 59)
    return events.filter(ev => {
      const t = new Date(ev.start.dateTime ?? ev.start.date ?? '')
      return t >= s && t <= e
    })
  }

  return (
    <FlexCol fullHeight noSelect className="p-2">
      <Grid cols={7} className="mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <Text key={i} variant="label" size="small" color="muted" align="center" className="py-0.5">{d}</Text>
        ))}
      </Grid>
      <Grid cols={7} flex1 className="gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <Box key={i} />
          const evs     = dayEvents(day)
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          return (
            <Box
              key={i}
              className={`rounded p-0.5 text-center min-h-0 ${isToday ? '' : 'hover:bg-[var(--wt-surface-hover)]'}`}
              style={isToday ? { background: 'var(--wt-surface-hover)' } : undefined}
            >
              <Text
                variant="label"
                size="small"
                color={isToday ? 'accent' : 'muted'}
                align="center"
                className="leading-none mb-0.5"
                style={{ fontSize: 14 }}
              >
                {day}
              </Text>
              <FlexRow wrap justify="center" className="gap-px">
                {evs.slice(0, 3).map(e => (
                  <span
                    key={e.id}
                    className="rounded-full"
                    style={{ width: 6, height: 6, background: eventColor(e), display: 'inline-block' }}
                    title={e.summary}
                  />
                ))}
                {evs.length > 3 && (
                  <Text as="span" variant="caption" size="small" color="muted" style={{ fontSize: 11, lineHeight: '1' }}>
                    +{evs.length - 3}
                  </Text>
                )}
              </FlexRow>
            </Box>
          )
        })}
      </Grid>
    </FlexCol>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'month'

const VIEW_OPTIONS = [
  { value: 'day',   label: 'Day'   },
  { value: 'week',  label: 'Week'  },
  { value: 'month', label: 'Month' },
]

export function CalendarWidget({ widgetId }: WidgetProps) {
  const [{ calendarId }] = useWidgetSettings(widgetId, { calendarId: '' })
  const { data: statusData, isLoading: statusLoading } = useGCalStatus()
  const [view, setView]       = useState<View>('day')
  const [current, setCurrent] = useState(new Date())

  const { timeMin, timeMax, weekStart } = (() => {
    if (view === 'day')   { const r = dayRange(current);   return { ...r, weekStart: undefined } }
    if (view === 'week')  { const r = weekRange(current);  return { ...r } }
    const r = monthRange(current); return { ...r, weekStart: undefined }
  })()

  const { data, isLoading, error, refetch, isFetching } = useGCalEvents(timeMin, timeMax, calendarId)
  const events: GCalEvent[] = data?.items ?? []

  function navigate(dir: 1 | -1) {
    if (view === 'day')   setCurrent(addDays(current, dir))
    if (view === 'week')  setCurrent(addDays(current, dir * 7))
    if (view === 'month') setCurrent(addMonths(current, dir))
  }

  function navLabel() {
    if (view === 'day') {
      const today = new Date()
      if (current.toDateString() === today.toDateString()) return 'Today'
      return current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
    if (view === 'week') {
      const ws = weekRange(current).start
      const we = addDays(ws, 6)
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Unconfigured: Google Calendar not connected
  if (statusLoading) {
    return (
      <Center fullHeight>
        <CalendarSkeleton />
      </Center>
    )
  }

  if (statusData && !statusData.connected) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="CalendarDots" size={36} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center" style={{ fontSize: 15 }}>
            Connect Google Calendar in Connectors to view your events
          </Text>
        </div>
      </Center>
    )
  }

  if (error) {
    return (
      <FlexCol align="center" justify="center" fullHeight gap="sm" className="p-4">
        <Icon icon="Warning" size={24} style={{ color: 'var(--wt-danger)' }} />
        <Text variant="label" size="small" color="danger" align="center">Failed to load events</Text>
        <Text variant="caption" size="large" color="muted" align="center">{(error as Error).message}</Text>
        <Button variant="link" size="sm" onClick={() => refetch()}>Retry</Button>
      </FlexCol>
    )
  }

  return (
    <FlexCol fullHeight style={{ background: 'var(--wt-bg)' }}>
      {/* Toolbar */}
      <FlexRow
        align="center"
        gap="xs"
        className="px-2 py-1.5 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--wt-border)' }}
      >
        <SegmentedControl
          value={view}
          options={VIEW_OPTIONS as { value: View; label: string }[]}
          onChange={(v) => setView(v)}
        />
        <IconButton icon="CaretLeft" size="sm" onClick={() => navigate(-1)} />
        <Text as="span" variant="label" size="small" color="muted" className="flex-1 text-center truncate">
          {navLabel()}
        </Text>
        <IconButton icon="CaretRight" size="sm" onClick={() => navigate(1)} />
        <IconButton
          icon="ArrowsClockwise"
          size="sm"
          onClick={() => refetch()}
          className={isFetching ? 'animate-spin' : ''}
        />
      </FlexRow>

      {/* Content */}
      <ScrollArea>
        {isLoading ? (
          <CalendarSkeleton />
        ) : view === 'day' ? (
          <DayView events={events} />
        ) : view === 'week' ? (
          <WeekView events={events} weekStart={weekStart ?? weekRange(current).start} />
        ) : (
          <MonthView events={events} date={current} />
        )}
      </ScrollArea>
    </FlexCol>
  )
}
