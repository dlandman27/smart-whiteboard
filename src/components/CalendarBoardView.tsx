import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, Button, SegmentedControl, Divider, ScrollArea,
  Panel, PanelHeader, Input,
} from '@whiteboard/ui-kit'
import { useUnifiedEvents, useEventGroups } from '../hooks/useUnifiedEvents'
import { createUnifiedEvent, deleteUnifiedEvent } from '../hooks/useEventMutations'
import type { UnifiedEvent, SourceGroup } from '../types/unified'
import { ProviderIcon } from './ProviderIcon'

// ── Color helpers ─────────────────────────────────────────────────────────────

// Resolved at render time via CSS variable
const DEFAULT_COLOR = 'var(--wt-accent)'

/** Resolve a color string to a hex value (handles CSS vars, rgb(), etc.) */
function resolveColor(raw: string): string {
  if (raw.startsWith('#')) return raw
  if (typeof document === 'undefined') return raw
  const el = document.createElement('div')
  el.style.color = raw
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)
  return computed
}

/** Parse any CSS color (hex, rgb(), etc.) into [r, g, b]. */
function parseColor(raw: string): [number, number, number] | null {
  const resolved = resolveColor(raw)
  // Try hex
  const hexM = resolved.match(/^#([0-9a-f]{3,8})$/i)
  if (hexM) {
    const h = hexM[1]
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)]
    if (h.length >= 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
  }
  // Try rgb(r, g, b) / rgba(r, g, b, a)
  const rgbM = resolved.match(/rgba?\(\s*(\d+)[, ]\s*(\d+)[, ]\s*(\d+)/)
  if (rgbM) return [+rgbM[1], +rgbM[2], +rgbM[3]]
  return null
}

/** Returns dark text for light backgrounds, white for dark ones. */
function contrastText(bg: string): string {
  const rgb = parseColor(bg)
  if (!rgb) return '#fff'
  const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.4 ? 'rgba(0,0,0,0.8)' : '#fff'
}

function contrastSub(fg: string): string {
  return fg === '#fff' ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.55)'
}

// Render-compatible event shape that the Week/Day/Month grids expect
interface RenderEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
  allDay: boolean
  colorId?: string
  htmlLink?: string
  _color: string
  _fg: string       // contrast text color for on top of _color
  _fgSub: string    // subdued contrast (times, secondary text)
  _calendarId: string
  _source: { provider: string; id: string }
  _readOnly: boolean
  _groupName: string
}

function toRenderEvent(e: UnifiedEvent): RenderEvent {
  const color = e.color || e.groupColor || DEFAULT_COLOR
  const fg    = contrastText(color)
  return {
    id: `${e.source.provider}:${e.source.id}`,
    summary: e.title,
    description: e.description,
    location: e.location,
    start: e.allDay ? { date: e.start } : { dateTime: e.start },
    end: e.end ? (e.allDay ? { date: e.end } : { dateTime: e.end }) : { dateTime: e.start },
    allDay: e.allDay,
    _color: color,
    _fg: fg,
    _fgSub: contrastSub(fg),
    _calendarId: `${e.source.provider}:${e.groupName}`,
    _source: e.source,
    _readOnly: e.readOnly,
    _groupName: e.groupName,
    // Pass through GCal extras if present
    colorId: (e as any)._gcalColorId,
    htmlLink: (e as any)._htmlLink,
  }
}

function eventColor(e: RenderEvent): string {
  return e._color
}

// Provider display labels
const PROVIDER_LABELS: Record<string, string> = {
  builtin: 'Wiigit Calendar',
  gcal:    'Google Calendar',
  ical:    'iCal Feeds',
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
  event:   RenderEvent
  color:   string
  onClick: (e: React.MouseEvent) => void
}) {
  if (!event.start.dateTime) return null
  const top    = topFor(event.start.dateTime)
  const height = heightFor(event.start.dateTime, event.end.dateTime ?? event.start.dateTime)
  return (
    <Box
      onClick={onClick}
      data-event
      style={{
        position:     'absolute',
        top,
        left:         2,
        right:        2,
        height,
        background:   color,
        borderRadius: 6,
        padding:      '3px 7px',
        overflow:     'hidden',
        cursor:       'pointer',
        zIndex:       1,
        boxShadow:    '0 1px 3px rgba(0,0,0,0.18)',
      }}
    >
      <FlexRow align="center" gap="xs" className="min-w-0">
        <ProviderIcon provider={event._source.provider} size={11} style={{ color: event._fg, flexShrink: 0, opacity: 0.85 }} />
        <Text variant="label" size="medium" numberOfLines={1} style={{ color: event._fg }}>
          {event.summary || '(No title)'}
        </Text>
      </FlexRow>
      {height > HOUR_H / 3 && (
        <Text variant="caption" size="medium" style={{ color: event._fgSub, marginTop: 1 }}>
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
  events, days, onSlotClick, onEventClick,
}: {
  events:       RenderEvent[]
  days:         Date[]
  onSlotClick:  (day: Date, hour: number, mins: number) => void
  onEventClick: (event: RenderEvent) => void
}) {
  const today = new Date()

  function handleDayClick(e: React.MouseEvent, day: Date) {
    // Ignore clicks on event blocks
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
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
                    color={eventColor(ev)}
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
  events, day, onSlotClick, onEventClick,
}: {
  events:       RenderEvent[]
  day:          Date
  onSlotClick:  (day: Date, hour: number, mins: number) => void
  onEventClick: (event: RenderEvent) => void
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
            <FlexRow
              key={ev.id}
              align="center"
              gap="xs"
              onClick={() => onEventClick(ev)}
              style={{
                fontSize: 12, padding: '2px 10px', borderRadius: 6, cursor: 'pointer',
                background: eventColor(ev),
              }}
            >
              <ProviderIcon provider={ev._source.provider} size={11} style={{ color: ev._fg, flexShrink: 0, opacity: 0.85 }} />
              <Text variant="label" size="medium" style={{ color: ev._fg }}>{ev.summary || '(No title)'}</Text>
            </FlexRow>
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
                color={eventColor(ev)}
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
  events, date, onDayClick, onEventClick,
}: {
  events:       RenderEvent[]
  date:         Date
  onDayClick:   (day: Date) => void
  onEventClick: (event: RenderEvent) => void
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
                  {evs.slice(0, 3).map(ev => {
                    const c = eventColor(ev)
                    const fg = contrastText(c)
                    return (
                    <FlexRow
                      key={ev.id}
                      align="center"
                      gap="xs"
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      style={{
                        background:   c,
                        borderRadius: 4,
                        padding:      '1px 5px',
                        overflow:     'hidden',
                        cursor:       'pointer',
                        minWidth:     0,
                      }}
                    >
                      <Box style={{ flexShrink: 0, opacity: 0.75, color: fg }}>
                        <ProviderIcon provider={ev._source.provider} size={10} style={{ color: fg }} />
                      </Box>
                      <Text variant="caption" size="medium" numberOfLines={1} style={{ color: fg }}>
                        {ev.summary || '(No title)'}
                      </Text>
                    </FlexRow>
                    )
                  })}
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
  event, onClose, onDelete,
}: {
  event:     RenderEvent
  onClose:   () => void
  onDelete:  () => void
}) {
  const color  = eventColor(event)
  const [deleting, setDeleting] = useState(false)
  const canDelete = !event._readOnly

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      // Reconstruct the UnifiedEvent-like shape for deleteUnifiedEvent
      await deleteUnifiedEvent({
        key: event.id,
        title: event.summary,
        start: event.start.dateTime ?? event.start.date ?? '',
        end: event.end?.dateTime ?? event.end?.date,
        allDay: event.allDay,
        groupName: event._groupName,
        source: event._source as any,
        readOnly: event._readOnly,
      })
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

          {event._groupName && (
            <FlexRow align="center" gap="sm">
              <Box style={{ flexShrink: 0, color }}>
                <ProviderIcon provider={event._source.provider} size={15} style={{ color }} />
              </Box>
              <Text variant="body" size="medium" color="muted">
                {event._groupName}
                {event._source.provider !== 'builtin' && (
                  <span style={{ opacity: 0.5 }}>{' · '}{PROVIDER_LABELS[event._source.provider] ?? ''}</span>
                )}
              </Text>
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

          {event.htmlLink && event._source.provider === 'gcal' && (
            <Button
              variant="outline"
              fullWidth
              onClick={() => window.open(event.htmlLink, '_blank')}
            >
              Open in Google Calendar
            </Button>
          )}

          {canDelete && (
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
  groups, defaultGroupKey,
  onClose, onCreated,
}: {
  initialDate:    Date
  initialHour:    number
  initialMins:    number
  groups:         SourceGroup[]
  defaultGroupKey: string
  onClose:        () => void
  onCreated:      () => void
}) {
  const endHour = initialHour + 1 >= END_HOUR ? END_HOUR - 1 : initialHour + 1

  // Only show writable groups in the picker
  const writableGroups = groups.filter(g => !g.readOnly)

  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(toDateStr(initialDate))
  const [startTime, setStartTime] = useState(padTime(initialHour, initialMins))
  const [endTime,   setEndTime]   = useState(padTime(endHour, initialMins))
  const [groupKey,  setGroupKey]  = useState(
    writableGroups.some(g => g.key === defaultGroupKey)
      ? defaultGroupKey
      : writableGroups[0]?.key ?? 'builtin:My Calendar'
  )
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
      const [providerId, ...rest] = groupKey.split(':')
      const groupId = rest.join(':')
      await createUnifiedEvent(providerId, groupId, {
        title: title.trim(),
        start: `${date}T${startTime}:00`,
        end:   `${date}T${endTime}:00`,
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

  const showCalPicker = writableGroups.length > 1

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
              {writableGroups.map(g => {
                const active = groupKey === g.key
                return (
                  <FlexRow
                    key={g.key}
                    align="center"
                    gap="sm"
                    onClick={() => setGroupKey(g.key)}
                    style={{
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: active ? 'var(--wt-surface-raised, var(--wt-surface))' : 'transparent',
                      border: active ? '1px solid var(--wt-border)' : '1px solid transparent',
                    }}
                  >
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: g.color || 'var(--wt-accent)', flexShrink: 0 }} />
                    <Text variant="body" size="medium" style={{ flex: 1 }} numberOfLines={1}>{g.groupName}</Text>
                    {g.provider !== 'builtin' && (
                      <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.5 }}>
                        {PROVIDER_LABELS[g.provider]}
                      </Text>
                    )}
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
  groups, visibleGroupKeys, onToggleGroup, todayEvents,
}: {
  groups:           SourceGroup[]
  visibleGroupKeys: Set<string>
  onToggleGroup:    (key: string) => void
  todayEvents:      RenderEvent[]
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const upcoming = todayEvents
    .filter(e => e.start.dateTime && new Date(e.start.dateTime) > now)
    .sort((a, b) => new Date(a.start.dateTime!).getTime() - new Date(b.start.dateTime!).getTime())

  const [timeMain, timePeriod] = now
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .split(' ')

  // Group the source groups by provider
  const providerSections = useMemo(() => {
    const map = new Map<string, SourceGroup[]>()
    for (const g of groups) {
      const list = map.get(g.provider) ?? []
      list.push(g)
      map.set(g.provider, list)
    }
    // Ensure "builtin" comes first, then "gcal", then "ical"
    const order = ['builtin', 'gcal', 'ical']
    return order
      .filter(p => map.has(p))
      .map(p => ({ provider: p, label: PROVIDER_LABELS[p] ?? p, groups: map.get(p)! }))
  }, [groups])

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

      {/* Calendar sources by provider */}
      {providerSections.map(section => (
        <div key={section.provider}>
          <FlexCol gap="xs" className="px-4 py-3">
            <FlexRow align="center" gap="xs" style={{ marginBottom: 4 }}>
              <ProviderIcon provider={section.provider} size={12} />
              <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ opacity: 0.5, letterSpacing: '0.1em' }}>
                {section.label}
              </Text>
            </FlexRow>
            {section.groups.map(g => {
              const on = visibleGroupKeys.has(g.key)
              return (
                <FlexRow
                  key={g.key}
                  align="center"
                  gap="sm"
                  onClick={() => onToggleGroup(g.key)}
                  style={{ cursor: 'pointer', padding: '3px 0', userSelect: 'none' }}
                >
                  <Box style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    background: on ? (g.color || 'var(--wt-accent)') : 'transparent',
                    border: `2px solid ${g.color || 'var(--wt-accent)'}`,
                  }} />
                  <Text
                    variant="body"
                    size="medium"
                    numberOfLines={1}
                    style={{ flex: 1, opacity: on ? 1 : 0.4 }}
                  >
                    {g.groupName}
                  </Text>
                  {g.readOnly && (
                    <Icon icon="EyeSlash" size={11} style={{ color: 'var(--wt-text-muted)', opacity: 0.3 }} />
                  )}
                </FlexRow>
              )
            })}
          </FlexCol>
          <Divider />
        </div>
      ))}

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
                  {ev.start.dateTime ? fmt(ev.start.dateTime) : 'All day'}
                  {ev.end?.dateTime && ` – ${fmt(ev.end.dateTime)}`}
                </Text>
              </FlexCol>
            </FlexRow>
          ))
        )}
      </FlexCol>
    </FlexCol>
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
  const qc = useQueryClient()

  // Fetch all calendar groups from all providers
  const { data: groups = [], isLoading: groupsLoading } = useEventGroups()

  // Which calendar groups are currently visible (all by default once loaded)
  const [visibleGroupKeys, setVisibleGroupKeys] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (groups.length > 0) setVisibleGroupKeys(new Set(groups.map(g => g.key)))
  }, [groups.map(g => g.key).join(',')])  // eslint-disable-line

  const [view, setView]       = useState<CalView>('week')
  const [current, setCurrent] = useState(new Date())

  // Modal state
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number; mins: number } | null>(null)
  const [detailEvent, setDetailEvent] = useState<RenderEvent | null>(null)

  const range =
    view === 'day'   ? dayRange(current)
    : view === 'week'  ? weekRange(current)
    : monthRange(current)

  const { data: unifiedEvents, isLoading, isFetching, refetch } = useUnifiedEvents(
    range.timeMin, range.timeMax, visibleGroupKeys,
  )

  // Map unified events to render events
  const events: RenderEvent[] = useMemo(
    () => (unifiedEvents ?? []).map(toRenderEvent),
    [unifiedEvents],
  )

  // Today's events for the sidebar "Upcoming" section — derive from the
  // main query when today falls within the current range, avoiding a second fetch
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayInRange = new Date(range.timeMin) <= todayStart && new Date(range.timeMax) >= todayEnd

  const { data: todayUnifiedEvents } = useUnifiedEvents(
    todayInRange ? range.timeMin : todayStart.toISOString(),
    todayInRange ? range.timeMax : todayEnd.toISOString(),
    visibleGroupKeys,
  )
  const todayEvents: RenderEvent[] = useMemo(() => {
    const all = (todayUnifiedEvents ?? []).map(toRenderEvent)
    if (todayInRange) {
      // Filter to just today's events from the broader range
      const ds = todayStart.toISOString()
      const de = todayEnd.toISOString()
      return all.filter(e => {
        const eStart = e.start.dateTime ?? e.start.date ?? ''
        return eStart >= ds && eStart <= de
      })
    }
    return all
  }, [todayUnifiedEvents, todayInRange])

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
    openCreate(day, 9, 0)
  }

  function onCreated() {
    qc.invalidateQueries({ queryKey: ['unified-events'] })
  }

  function onDeleted() {
    setDetailEvent(null)
    qc.invalidateQueries({ queryKey: ['unified-events'] })
  }

  function toggleGroup(key: string) {
    setVisibleGroupKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  // Default group for creating events (first writable group)
  const defaultGroupKey = groups.find(g => !g.readOnly)?.key ?? 'builtin:My Calendar'

  if (groupsLoading && groups.length === 0) return (
    <Center className="absolute inset-0">
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid var(--wt-border)', borderTopColor: 'var(--wt-accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Center>
  )

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
          {isLoading && !events.length ? (
            <Center flex1>
              <Text variant="body" size="medium" color="muted" style={{ opacity: 0.5 }}>Loading…</Text>
            </Center>
          ) : view === 'week' ? (
            <WeekGrid
              events={events}
              days={weekDays}
              onSlotClick={onSlotClick}
              onEventClick={setDetailEvent}
            />
          ) : view === 'day' ? (
            <DayGrid
              events={events}
              day={current}
              onSlotClick={onSlotClick}
              onEventClick={setDetailEvent}
            />
          ) : (
            <MonthGrid
              events={events}
              date={current}
              onDayClick={onDayClick}
              onEventClick={setDetailEvent}
            />
          )}
        </FlexCol>

        <InfoPanel
          groups={groups}
          visibleGroupKeys={visibleGroupKeys}
          onToggleGroup={toggleGroup}
          todayEvents={todayEvents}
        />
      </FlexRow>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {createModal && (
        <CreateEventModal
          initialDate={createModal.date}
          initialHour={createModal.hour}
          initialMins={createModal.mins}
          groups={groups}
          defaultGroupKey={defaultGroupKey}
          onClose={() => setCreateModal(null)}
          onCreated={onCreated}
        />
      )}

      {detailEvent && (
        <EventDetail
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onDelete={onDeleted}
        />
      )}

    </FlexCol>
  )
}
