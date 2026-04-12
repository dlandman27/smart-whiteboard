import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, Button, SegmentedControl, Divider, ScrollArea,
  Panel, PanelHeader, Input,
} from '@whiteboard/ui-kit'
import {
  useGCalEvents, useGCalStatus, useGCalCalendars,
  useAllCalendarEvents, createGCalEvent, deleteGCalEvent,
  startGCalAuth,
  type GCalEvent, type GCalCalendar,
} from '../hooks/useGCal'
import { useWhiteboardStore } from '../store/whiteboard'

// ── Color map ─────────────────────────────────────────────────────────────────

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

const timeInputStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
  color: 'var(--wt-text)', outline: 'none', width: '100%',
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekDays(d: Date): Date[] {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon); dd.setDate(mon.getDate() + i); return dd
  })
}

function weekRange(d: Date) {
  const days = getWeekDays(d)
  return {
    timeMin: new Date(new Date(days[0]).setHours(0, 0, 0, 0)).toISOString(),
    timeMax: new Date(new Date(days[6]).setHours(23, 59, 59, 999)).toISOString(),
  }
}

function dayRange(d: Date) {
  const s = new Date(d); s.setHours(0, 0, 0, 0)
  const e = new Date(d); e.setHours(23, 59, 59, 999)
  return { timeMin: s.toISOString(), timeMax: e.toISOString() }
}

function monthRange(d: Date) {
  return {
    timeMin: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
    timeMax: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function fmt(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function padTime(h: number, m = 0): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Time grid constants ───────────────────────────────────────────────────────

const START_HOUR = 0
const END_HOUR   = 24
const HOUR_H     = 64
const HOURS      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TOTAL_H    = HOURS.length * HOUR_H

function topFor(dt: string): number {
  const d = new Date(dt)
  return Math.max(0, (d.getHours() + d.getMinutes() / 60 - START_HOUR) * HOUR_H)
}

function heightFor(start: string, end: string): number {
  const dur = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000
  return Math.max(HOUR_H / 4, dur * HOUR_H)
}

function slotFromClick(clientY: number, rect: DOMRect): { hour: number; mins: number } {
  const y       = Math.max(0, clientY - rect.top)
  const rawHour = START_HOUR + y / HOUR_H
  const hour    = Math.min(END_HOUR - 1, Math.floor(rawHour))
  const mins    = rawHour % 1 >= 0.5 ? 30 : 0
  return { hour, mins }
}

// ── Time gutter ───────────────────────────────────────────────────────────────

function TimeGutter() {
  return (
    <Box className="flex-shrink-0 select-none" style={{ width: 52 }}>
      {HOURS.map(h => (
        <FlexRow
          key={h}
          align="start"
          justify="end"
          style={{ height: HOUR_H, paddingRight: 8, paddingTop: 2 }}
        >
          <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.55, lineHeight: 1 }}>
            {h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
          </Text>
        </FlexRow>
      ))}
    </Box>
  )
}

// ── Event block ───────────────────────────────────────────────────────────────

function EventBlock({
  event, color, onClick,
}: {
  event:   GCalEvent
  color:   string
  onClick: (e: React.MouseEvent) => void
}) {
  if (!event.start.dateTime) return null
  const top    = topFor(event.start.dateTime)
  const height = heightFor(event.start.dateTime, event.end.dateTime ?? event.start.dateTime)

  return (
    <Box
      onClick={onClick}
      style={{
        position:     'absolute',
        top,
        left:         2,
        right:        2,
        height,
        background:   `color-mix(in srgb, ${color} 18%, var(--wt-bg))`,
        borderLeft:   `3px solid ${color}`,
        borderRadius: 4,
        padding:      '2px 6px',
        overflow:     'hidden',
        cursor:       'pointer',
        zIndex:       1,
      }}
    >
      <Text variant="label" size="medium" numberOfLines={1}>
        {event.summary || '(No title)'}
      </Text>
      {height > HOUR_H / 3 && (
        <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.7, marginTop: 1 }}>
          {fmt(event.start.dateTime)} – {fmt(event.end.dateTime ?? event.start.dateTime)}
        </Text>
      )}
    </Box>
  )
}

// ── Now line ──────────────────────────────────────────────────────────────────

function NowLine() {
  const now = new Date()
  const top = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_H
  if (top < 0 || top > TOTAL_H) return null
  return (
    <FlexRow
      align="center"
      style={{ position: 'absolute', top, left: 0, right: 0, zIndex: 2, pointerEvents: 'none' }}
    >
      <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea4335', flexShrink: 0, marginLeft: -4 }} />
      <Box flex1 style={{ height: 2, background: '#ea4335', opacity: 0.9 }} />
    </FlexRow>
  )
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekGrid({
  events, days, calColors, onSlotClick, onEventClick,
}: {
  events:       GCalEvent[]
  days:         Date[]
  calColors:    Record<string, string>
  onSlotClick:  (day: Date, hour: number, mins: number) => void
  onEventClick: (event: GCalEvent) => void
}) {
  const today = new Date()

  function handleDayClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    // Ignore clicks on event blocks
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const { hour, mins } = slotFromClick(e.clientY, rect)
    onSlotClick(day, hour, mins)
  }

  return (
    <FlexCol flex1 overflow="hidden" className="min-h-0">
      {/* Fixed day headers (left-padded to align with columns past the gutter) */}
      <FlexRow className="flex-shrink-0" style={{ paddingLeft: 52, borderBottom: '1px solid var(--wt-border)' }}>
        {days.map(day => {
          const isToday = day.toDateString() === today.toDateString()
          return (
            <FlexCol key={day.toISOString()} flex1 align="center" className="py-2">
              <Text
                variant="label" size="small"
                color={isToday ? 'accent' : 'muted'}
                textTransform="uppercase"
                style={{ opacity: isToday ? 1 : 0.55 }}
              >
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Box style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                background: isToday ? 'var(--wt-accent)' : 'transparent',
              }}>
                <Text variant="heading" size="small" color={isToday ? 'onAccent' : 'default'} style={{ lineHeight: 1 }}>
                  {day.getDate()}
                </Text>
              </Box>
            </FlexCol>
          )
        })}
      </FlexRow>

      {/* Scrollable area — gutter + day columns scroll together */}
      <ScrollArea className="rounded-b-2xl wt-scroll">
        <FlexRow align="stretch" className="pt-3 pb-6">
          <TimeGutter />
          {days.map(day => {
            const s       = new Date(day); s.setHours(0, 0, 0, 0)
            const e       = new Date(day); e.setHours(23, 59, 59, 999)
            const isToday = day.toDateString() === today.toDateString()
            const dayEvs  = events.filter(ev => {
              if (!ev.start.dateTime) return false
              const t = new Date(ev.start.dateTime)
              return t >= s && t <= e
            })
            return (
              <Box
                key={day.toISOString()}
                flex1
                onClick={ev => handleDayClick(ev, day)}
                style={{
                  position:   'relative',
                  height:     TOTAL_H,
                  borderRight: '1px solid var(--wt-border)',
                  background: isToday ? 'color-mix(in srgb, var(--wt-accent) 4%, transparent)' : 'transparent',
                  cursor:     'crosshair',
                }}
              >
                {HOURS.map(h => (
                  <Box key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--wt-border)', opacity: 0.4 }} />
                ))}
                {dayEvs.map(ev => (
                  <EventBlock
                    key={ev.id}
                    event={ev}
                    color={eventColor(ev, calColors)}
                    onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                  />
                ))}
                {isToday && <NowLine />}
              </Box>
            )
          })}
        </FlexRow>
      </ScrollArea>
    </FlexCol>
  )
}

// ── Day view ──────────────────────────────────────────────────────────────────

function DayGrid({
  events, day, calColors, onSlotClick, onEventClick,
}: {
  events:       GCalEvent[]
  day:          Date
  calColors:    Record<string, string>
  onSlotClick:  (day: Date, hour: number, mins: number) => void
  onEventClick: (event: GCalEvent) => void
}) {
  const today   = new Date()
  const isToday = day.toDateString() === today.toDateString()
  const s       = new Date(day); s.setHours(0, 0, 0, 0)
  const e       = new Date(day); e.setHours(23, 59, 59, 999)

  const allDay = events.filter(ev => !ev.start.dateTime)
  const timed  = events.filter(ev => {
    if (!ev.start.dateTime) return false
    const t = new Date(ev.start.dateTime)
    return t >= s && t <= e
  })

  function handleClick(ev: React.MouseEvent<HTMLDivElement>) {
    if ((ev.target as HTMLElement).closest('[data-event]')) return
    const rect = ev.currentTarget.getBoundingClientRect()
    const { hour, mins } = slotFromClick(ev.clientY, rect)
    onSlotClick(day, hour, mins)
  }

  return (
    <FlexCol flex1 overflow="hidden" className="min-h-0">
      {allDay.length > 0 && (
        <FlexRow wrap gap="xs" className="flex-shrink-0 px-2 py-1.5" style={{ paddingLeft: 60, borderBottom: '1px solid var(--wt-border)' }}>
          {allDay.map(ev => (
            <Box
              key={ev.id}
              onClick={() => onEventClick(ev)}
              style={{
                fontSize: 12, padding: '2px 10px', borderRadius: 12, cursor: 'pointer',
                background: `color-mix(in srgb, ${eventColor(ev, calColors)} 20%, var(--wt-surface))`,
                border:     `1px solid color-mix(in srgb, ${eventColor(ev, calColors)} 30%, transparent)`,
              }}
            >
              <Text variant="label" size="medium">{ev.summary || '(No title)'}</Text>
            </Box>
          ))}
        </FlexRow>
      )}
      {/* Scrollable area — gutter + day column scroll together */}
      <ScrollArea className="rounded-b-2xl wt-scroll">
        <FlexRow align="stretch" className="pt-3 pb-6">
          <TimeGutter />
          <Box
            flex1
            onClick={handleClick}
            style={{
              position: 'relative', height: TOTAL_H, cursor: 'crosshair',
              background: isToday ? 'color-mix(in srgb, var(--wt-accent) 4%, transparent)' : 'transparent',
            }}
          >
            {HOURS.map(h => (
              <Box key={h} style={{ position: 'absolute', top: (h - START_HOUR) * HOUR_H, left: 0, right: 0, borderTop: '1px solid var(--wt-border)', opacity: 0.4 }} />
            ))}
            {timed.map(ev => (
              <EventBlock
                key={ev.id}
                event={ev}
                color={eventColor(ev, calColors)}
                onClick={e => { e.stopPropagation(); onEventClick(ev) }}
              />
            ))}
            {isToday && <NowLine />}
          </Box>
        </FlexRow>
      </ScrollArea>
    </FlexCol>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthGrid({
  events, date, calColors, onDayClick, onEventClick,
}: {
  events:       GCalEvent[]
  date:         Date
  calColors:    Record<string, string>
  onDayClick:   (day: Date) => void
  onEventClick: (event: GCalEvent) => void
}) {
  const year        = date.getFullYear()
  const month       = date.getMonth()
  const today       = new Date()
  const firstDay    = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset      = (firstDay.getDay() + 6) % 7

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, (i + 1) * 7))

  function dayEvs(d: number) {
    const s = new Date(year, month, d)
    const e = new Date(year, month, d, 23, 59, 59)
    return events.filter(ev => {
      const t = new Date(ev.start.dateTime ?? ev.start.date ?? '')
      return t >= s && t <= e
    })
  }

  return (
    <FlexCol flex1 className="px-2 pb-2 min-h-0 gap-1.5" overflow="hidden">
      <FlexRow className="flex-shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <Box key={d} style={{ flex: 1 }}>
            <Text variant="label" size="small" color="muted" align="center" textTransform="uppercase" className="py-1" style={{ opacity: 0.5 }}>
              {d}
            </Text>
          </Box>
        ))}
      </FlexRow>

      <FlexCol flex1 className="min-h-0 gap-1.5" overflow="hidden">
        {rows.map((row, ri) => (
          <FlexRow key={ri} align="stretch" className="flex-1 min-h-0 gap-1.5">
            {row.map((day, ci) => {
              if (!day) return <Box key={ci} style={{ flex: 1 }} />
              const evs     = dayEvs(day)
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
              return (
                <FlexCol
                  key={ci}
                  onClick={() => onDayClick(new Date(year, month, day))}
                  style={{
                    flex: 1, minWidth: 0, borderRadius: 8, padding: '6px 6px 4px',
                    background: isToday
                      ? 'color-mix(in srgb, var(--wt-accent) 12%, var(--wt-surface))'
                      : 'var(--wt-surface)',
                    border: isToday ? '1.5px solid var(--wt-accent)' : '1px solid var(--wt-border)',
                    overflow: 'hidden', gap: 2, cursor: 'pointer',
                  }}
                >
                  <Text
                    variant="label" size="large"
                    color={isToday ? 'accent' : 'default'}
                    style={{ lineHeight: 1, marginBottom: 2 }}
                  >
                    {day}
                  </Text>
                  {evs.slice(0, 3).map(ev => (
                    <Box
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      style={{
                        background:   `color-mix(in srgb, ${eventColor(ev, calColors)} 22%, transparent)`,
                        borderLeft:   `2px solid ${eventColor(ev, calColors)}`,
                        borderRadius: 3,
                        padding:      '1px 4px',
                        overflow:     'hidden',
                        cursor:       'pointer',
                      }}
                    >
                      <Text variant="caption" size="medium" numberOfLines={1}>
                        {ev.summary || '(No title)'}
                      </Text>
                    </Box>
                  ))}
                  {evs.length > 3 && (
                    <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.55 }}>
                      +{evs.length - 3} more
                    </Text>
                  )}
                </FlexCol>
              )
            })}
          </FlexRow>
        ))}
      </FlexCol>
    </FlexCol>
  )
}

// ── Event detail popover ──────────────────────────────────────────────────────

function EventDetail({
  event, calColors, calName, onClose, onDelete,
}: {
  event:     GCalEvent
  calColors: Record<string, string>
  calName:   string
  onClose:   () => void
  onDelete:  () => void
}) {
  const color  = eventColor(event, calColors)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!event._calendarId) return
    setDeleting(true)
    try {
      await deleteGCalEvent(event._calendarId, event.id)
      onDelete()
    } catch {
      setDeleting(false)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <Box
      style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <Panel width={360} onClose={onClose}>
        <Box style={{ borderTop: `4px solid ${color}`, borderRadius: '12px 12px 0 0' }} />
        <FlexCol gap="md" className="px-4 pt-3 pb-4">
          <FlexRow align="start" justify="between">
            <Text variant="heading" size="small" style={{ flex: 1, marginRight: 8 }}>
              {event.summary || '(No title)'}
            </Text>
            <IconButton icon="X" size="sm" onClick={onClose} />
          </FlexRow>

          {event.start.dateTime && (
            <FlexRow align="center" gap="sm">
              <Icon icon="Clock" size={15} style={{ color: 'var(--wt-text-muted)', opacity: 0.6, flexShrink: 0 }} />
              <Text variant="body" size="medium" color="muted">
                {new Date(event.start.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' · '}
                {fmt(event.start.dateTime)}
                {event.end.dateTime && ` – ${fmt(event.end.dateTime)}`}
              </Text>
            </FlexRow>
          )}

          {event.start.date && !event.start.dateTime && (
            <FlexRow align="center" gap="sm">
              <Icon icon="CalendarBlank" size={15} style={{ color: 'var(--wt-text-muted)', opacity: 0.6, flexShrink: 0 }} />
              <Text variant="body" size="medium" color="muted">
                {new Date(event.start.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {' · All day'}
              </Text>
            </FlexRow>
          )}

          {calName && (
            <FlexRow align="center" gap="sm">
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <Text variant="body" size="medium" color="muted">{calName}</Text>
            </FlexRow>
          )}

          {event.description && (
            <FlexRow align="start" gap="sm">
              <Icon icon="TextAlignLeft" size={15} style={{ color: 'var(--wt-text-muted)', opacity: 0.6, flexShrink: 0, marginTop: 2 }} />
              <Text variant="body" size="medium" color="muted" style={{ whiteSpace: 'pre-wrap' }}>
                {event.description}
              </Text>
            </FlexRow>
          )}

          {event.location && (
            <FlexRow align="center" gap="sm">
              <Icon icon="MapPin" size={15} style={{ color: 'var(--wt-text-muted)', opacity: 0.6, flexShrink: 0 }} />
              <Text variant="body" size="medium" color="muted">{event.location}</Text>
            </FlexRow>
          )}

          {event.htmlLink && (
            <Button
              variant="outline"
              fullWidth
              onClick={() => window.open(event.htmlLink, '_blank')}
            >
              Open in Google Calendar
            </Button>
          )}

          {event._calendarId && (
            <Button
              variant="outline"
              fullWidth
              disabled={deleting}
              onClick={handleDelete}
              style={{ color: '#e53935', borderColor: 'color-mix(in srgb, #e53935 30%, transparent)' }}
            >
              {deleting ? 'Deleting…' : 'Delete event'}
            </Button>
          )}
        </FlexCol>
      </Panel>
    </Box>
  )
}

// ── Create event modal ────────────────────────────────────────────────────────

function CreateEventModal({
  initialDate, initialHour, initialMins,
  calendars, defaultCalendarId,
  onClose, onCreated,
}: {
  initialDate:       Date
  initialHour:       number
  initialMins:       number
  calendars:         GCalCalendar[]
  defaultCalendarId: string
  onClose:           () => void
  onCreated:         () => void
}) {
  const endHour = initialHour + 1 >= END_HOUR ? END_HOUR - 1 : initialHour + 1

  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(toDateStr(initialDate))
  const [startTime, setStartTime] = useState(padTime(initialHour, initialMins))
  const [endTime,   setEndTime]   = useState(padTime(endHour, initialMins))
  const [calId,     setCalId]     = useState(defaultCalendarId)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      await createGCalEvent(calId, {
        summary: title.trim(),
        start: { dateTime: `${date}T${startTime}:00`, timeZone: tz },
        end:   { dateTime: `${date}T${endTime}:00`,   timeZone: tz },
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to create event')
      setSaving(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
  }

  const showCalPicker = calendars.length > 1

  return (
    <Box
      style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <Panel width={400} onClose={onClose}>
        <PanelHeader title="New event" onClose={onClose} />
        <FlexCol gap="md" className="px-4 pb-4">
          <Input
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add title"
            autoFocus
          />

          <FlexRow gap="sm" align="end">
            <FlexCol flex1 gap="none">
              <Text variant="label" size="small" color="muted" style={{ marginBottom: 4 }}>Date</Text>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={timeInputStyle} />
            </FlexCol>
            <FlexCol style={{ width: 110 }} gap="none">
              <Text variant="label" size="small" color="muted" style={{ marginBottom: 4 }}>Start</Text>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={timeInputStyle} />
            </FlexCol>
            <FlexCol style={{ width: 110 }} gap="none">
              <Text variant="label" size="small" color="muted" style={{ marginBottom: 4 }}>End</Text>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={timeInputStyle} />
            </FlexCol>
          </FlexRow>

          {showCalPicker && (
            <FlexCol gap="xs">
              <Text variant="label" size="small" color="muted">Calendar</Text>
              {calendars.map(cal => {
                const active = calId === cal.id
                return (
                  <FlexRow
                    key={cal.id}
                    align="center"
                    gap="sm"
                    onClick={() => setCalId(cal.id)}
                    style={{
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: active ? 'var(--wt-surface-raised, var(--wt-surface))' : 'transparent',
                      border: active ? '1px solid var(--wt-border)' : '1px solid transparent',
                    }}
                  >
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: cal.backgroundColor ?? DEFAULT_COLOR, flexShrink: 0 }} />
                    <Text variant="body" size="medium" style={{ flex: 1 }} numberOfLines={1}>{cal.summary}</Text>
                    {active && <Icon icon="Check" size={14} style={{ color: 'var(--wt-accent)' }} />}
                  </FlexRow>
                )
              })}
            </FlexCol>
          )}

          {error && (
            <Text variant="caption" size="large" style={{ color: '#e53935' }}>{error}</Text>
          )}

          <Button variant="accent" fullWidth onClick={save} disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create event'}
          </Button>
        </FlexCol>
      </Panel>
    </Box>
  )
}

// ── Right info panel ──────────────────────────────────────────────────────────

function InfoPanel({
  calendarId, calendars, visibleCalIds, onToggleCalendar,
}: {
  calendarId:       string
  calendars:        GCalCalendar[]
  visibleCalIds:    Set<string>
  onToggleCalendar: (id: string) => void
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = new Date()
  const { timeMin, timeMax } = dayRange(today)
  const { data } = useGCalEvents(timeMin, timeMax, calendarId)

  const upcoming: GCalEvent[] = (data?.items ?? [])
    .filter(e => e.start.dateTime && new Date(e.start.dateTime) > now)
    .sort((a, b) => new Date(a.start.dateTime!).getTime() - new Date(b.start.dateTime!).getTime())

  const [timeMain, timePeriod] = now
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .split(' ')

  return (
    <FlexCol
      gap="none"
      className="flex-shrink-0 overflow-y-auto"
      style={{ width: 260, borderLeft: '1px solid var(--wt-border)' }}
    >
      {/* Clock */}
      <FlexCol gap="none" className="px-4 pt-6 pb-4">
        <FlexRow align="baseline" gap="xs">
          <Text variant="display" size="large" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
            {timeMain}
          </Text>
          <Text variant="heading" size="small" color="muted" style={{ opacity: 0.55 }}>
            {timePeriod}
          </Text>
        </FlexRow>
        <Text variant="body" size="medium" color="muted" style={{ marginTop: 4, opacity: 0.75 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </FlexCol>

      <Divider />

      {/* Calendars */}
      {calendars.length > 0 && (
        <>
          <FlexCol gap="xs" className="px-4 py-3">
            <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ opacity: 0.5, letterSpacing: '0.1em', marginBottom: 4 }}>
              Calendars
            </Text>
            {calendars.map(cal => {
              const on = visibleCalIds.has(cal.id)
              return (
                <FlexRow
                  key={cal.id}
                  align="center"
                  gap="sm"
                  onClick={() => onToggleCalendar(cal.id)}
                  style={{ cursor: 'pointer', padding: '3px 0', userSelect: 'none' }}
                >
                  <Box style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background:  on  ? (cal.backgroundColor ?? DEFAULT_COLOR) : 'transparent',
                    border:      `2px solid ${cal.backgroundColor ?? DEFAULT_COLOR}`,
                  }} />
                  <Text
                    variant="body"
                    size="medium"
                    numberOfLines={1}
                    style={{ flex: 1, opacity: on ? 1 : 0.4 }}
                  >
                    {cal.summary}
                  </Text>
                </FlexRow>
              )
            })}
          </FlexCol>
          <Divider />
        </>
      )}

      {/* Upcoming events */}
      <FlexCol gap="sm" className="px-4 py-3">
        <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ opacity: 0.5, letterSpacing: '0.1em' }}>
          Upcoming
        </Text>

        {upcoming.length === 0 ? (
          <Text variant="body" size="medium" color="muted" style={{ opacity: 0.4 }}>
            Nothing left today
          </Text>
        ) : (
          upcoming.map(ev => (
            <FlexRow key={ev.id} align="start" gap="sm">
              <Box style={{ width: 3, borderRadius: 3, alignSelf: 'stretch', flexShrink: 0, background: eventColor(ev), marginTop: 2 }} />
              <FlexCol gap="none" className="min-w-0">
                <Text variant="label" size="large" numberOfLines={1}>
                  {ev.summary || '(No title)'}
                </Text>
                <Text variant="caption" size="large" color="muted" style={{ opacity: 0.65, marginTop: 1 }}>
                  {fmt(ev.start.dateTime!)}
                  {ev.end.dateTime && ` – ${fmt(ev.end.dateTime)}`}
                </Text>
              </FlexCol>
            </FlexRow>
          ))
        )}
      </FlexCol>
    </FlexCol>
  )
}

// ── Not-connected empty state ─────────────────────────────────────────────────

function ConnectPrompt() {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)

  function connect() {
    setLoading(true)
    startGCalAuth()
      .then(url => {
        const popup = window.open(url, 'gcal-auth', 'width=500,height=620,left=200,top=100')
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type === 'gcal-connected') {
            qc.invalidateQueries({ queryKey: ['gcal-status'] })
            qc.invalidateQueries({ queryKey: ['gcal-events'] })
            window.removeEventListener('message', onMessage)
            popup?.close()
            setLoading(false)
          }
        }
        window.addEventListener('message', onMessage)
      })
      .catch(() => setLoading(false))
  }

  return (
    <Center className="absolute inset-0">
      <FlexCol align="center" gap="md" style={{ maxWidth: 320, textAlign: 'center', padding: '0 24px' }}>
        <Box style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'color-mix(in srgb, var(--wt-accent) 12%, var(--wt-surface))',
          border: '1px solid color-mix(in srgb, var(--wt-accent) 25%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon icon="CalendarBlank" size={28} style={{ color: 'var(--wt-accent)' }} />
        </Box>
        <FlexCol align="center" gap="xs">
          <Text variant="heading" size="small" align="center">Connect Google Calendar</Text>
          <Text variant="body" size="medium" color="muted" align="center">
            Sign in with Google to see your events on this board.
          </Text>
        </FlexCol>
        <Button variant="accent" size="md" onClick={connect} disabled={loading}>
          {loading ? 'Opening…' : 'Connect Google Calendar'}
        </Button>
      </FlexCol>
    </Center>
  )
}

// ── View options ──────────────────────────────────────────────────────────────

type CalView = 'day' | 'week' | 'month'

const VIEW_OPTIONS = [
  { value: 'day',   label: 'Day'   },
  { value: 'week',  label: 'Week'  },
  { value: 'month', label: 'Month' },
] as const

// ── Main export ───────────────────────────────────────────────────────────────

export function CalendarBoardView() {
  const { boards, activeBoardId } = useWhiteboardStore()
  const activeBoard = boards.find(b => b.id === activeBoardId)
  const calendarId  = (activeBoard as any)?.calendarId ?? 'primary'

  const qc = useQueryClient()
  const { data: gcalStatus, isLoading: statusLoading } = useGCalStatus()
  const { data: calData }      = useGCalCalendars()
  const connected              = !!gcalStatus?.connected
  const calendars: GCalCalendar[] = calData?.items ?? []

  // Which calendars are currently shown (all by default once loaded)
  const [visibleCalIds, setVisibleCalIds] = useState<Set<string>>(new Set([calendarId]))
  useEffect(() => {
    if (calendars.length > 0) setVisibleCalIds(new Set(calendars.map(c => c.id)))
  }, [calendars.map(c => c.id).join(',')])  // eslint-disable-line

  // Map calendarId → backgroundColor for event coloring
  const calColors = Object.fromEntries(
    calendars.map(c => [c.id, c.backgroundColor ?? DEFAULT_COLOR])
  )

  const [view, setView]       = useState<CalView>('week')
  const [current, setCurrent] = useState(new Date())

  // Modal state
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number; mins: number } | null>(null)
  const [detailEvent, setDetailEvent] = useState<GCalEvent | null>(null)

  const range =
    view === 'day'   ? dayRange(current)
    : view === 'week'  ? weekRange(current)
    : monthRange(current)

  const visibleIds = Array.from(visibleCalIds)
  const { data, isLoading, isFetching, refetch } = useAllCalendarEvents(
    range.timeMin, range.timeMax, visibleIds,
  )
  const events: GCalEvent[] = data ?? []
  const weekDays = view === 'week' ? getWeekDays(current) : []

  function navigate(dir: 1 | -1) {
    if (view === 'day')   setCurrent(d => addDays(d, dir))
    if (view === 'week')  setCurrent(d => addDays(d, dir * 7))
    if (view === 'month') setCurrent(d => addMonths(d, dir))
  }

  function navLabel() {
    if (view === 'day') {
      return current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (view === 'week') {
      const days = getWeekDays(current)
      const s = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const e = days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${s} – ${e}`
    }
    return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function openCreate(date: Date, hour = 9, mins = 0) {
    setCreateModal({ date, hour, mins })
  }

  function onSlotClick(day: Date, hour: number, mins: number) {
    openCreate(day, hour, mins)
  }

  function onDayClick(day: Date) {
    // Month view: clicking a day opens a create modal for 9am
    openCreate(day, 9, 0)
  }

  function onCreated() {
    qc.invalidateQueries({ queryKey: ['gcal-events-all'] })
    qc.invalidateQueries({ queryKey: ['gcal-events'] })
  }

  function onDeleted() {
    setDetailEvent(null)
    qc.invalidateQueries({ queryKey: ['gcal-events-all'] })
    qc.invalidateQueries({ queryKey: ['gcal-events'] })
  }

  function toggleCalendar(id: string) {
    setVisibleCalIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  const defaultCalId = calendars.find(c => c.primary)?.id ?? calendarId

  // Name lookup for event detail
  function calNameFor(ev: GCalEvent) {
    return calendars.find(c => c.id === ev._calendarId)?.summary ?? ''
  }

  if (statusLoading) return (
    <Center className="absolute inset-0">
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid var(--wt-border)', borderTopColor: 'var(--wt-accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Center>
  )
  if (!connected) return <ConnectPrompt />

  return (
    <FlexCol className="absolute inset-0" overflow="hidden" style={{ background: 'var(--wt-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <FlexRow
        align="center"
        gap="xs"
        className="flex-shrink-0 px-4"
        style={{ height: 52, borderBottom: '1px solid var(--wt-border)' }}
      >
        <IconButton icon="CaretLeft"  size="md" onClick={() => navigate(-1)} />
        <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
        <IconButton icon="CaretRight" size="md" onClick={() => navigate(1)} />

        <Text variant="title" size="medium" className="flex-1 ml-1" numberOfLines={1}>
          {navLabel()}
        </Text>

        {isFetching && (
          <Icon icon="ArrowsClockwise" size={14} className="animate-spin" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }} />
        )}

        <IconButton icon="ArrowsClockwise" size="md" title="Refresh" onClick={() => refetch()} />

        <Box style={{ width: 210 }}>
          <SegmentedControl
            value={view}
            options={VIEW_OPTIONS as unknown as { value: CalView; label: string }[]}
            onChange={setView}
          />
        </Box>

        <Button variant="accent" size="sm" onClick={() => openCreate(new Date())}>
          <Icon icon="Plus" size={14} style={{ marginRight: 4 }} />
          New event
        </Button>
      </FlexRow>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <FlexRow flex1 overflow="hidden" align="stretch" className="min-h-0">

        <FlexCol flex1 overflow="hidden" className="min-h-0">
          {isLoading ? (
            <Center flex1>
              <Text variant="body" size="medium" color="muted" style={{ opacity: 0.5 }}>Loading…</Text>
            </Center>
          ) : view === 'week' ? (
            <WeekGrid
              events={events}
              days={weekDays}
              calColors={calColors}
              onSlotClick={onSlotClick}
              onEventClick={setDetailEvent}
            />
          ) : view === 'day' ? (
            <DayGrid
              events={events}
              day={current}
              calColors={calColors}
              onSlotClick={onSlotClick}
              onEventClick={setDetailEvent}
            />
          ) : (
            <MonthGrid
              events={events}
              date={current}
              calColors={calColors}
              onDayClick={onDayClick}
              onEventClick={setDetailEvent}
            />
          )}
        </FlexCol>

        <InfoPanel
          calendarId={calendarId}
          calendars={calendars}
          visibleCalIds={visibleCalIds}
          onToggleCalendar={toggleCalendar}
        />
      </FlexRow>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {createModal && (
        <CreateEventModal
          initialDate={createModal.date}
          initialHour={createModal.hour}
          initialMins={createModal.mins}
          calendars={calendars}
          defaultCalendarId={defaultCalId}
          onClose={() => setCreateModal(null)}
          onCreated={onCreated}
        />
      )}

      {detailEvent && (
        <EventDetail
          event={detailEvent}
          calColors={calColors}
          calName={calNameFor(detailEvent)}
          onClose={() => setDetailEvent(null)}
          onDelete={onDeleted}
        />
      )}

    </FlexCol>
  )
}
