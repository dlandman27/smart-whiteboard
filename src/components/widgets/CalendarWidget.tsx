import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { IconButton } from '../../ui/web'
import { useGCalEvents, type GCalEvent } from '../../hooks/useGCal'

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
  const diff = day === 0 ? -6 : 1 - day          // Monday-first offset
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

// ── Sub-views ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: GCalEvent }) {
  const isAllDay = !event.start.dateTime
  const color = eventColor(event)
  const start = isAllDay ? null : formatTime(event.start.dateTime!)
  const end   = isAllDay ? null : formatTime(event.end.dateTime!)
  return (
    <div className="flex items-start gap-2 py-1.5 px-3 hover:bg-stone-50 group">
      <div className="w-0.5 rounded-full self-stretch flex-shrink-0 mt-0.5" style={{ background: color, minHeight: 16 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-700 truncate leading-snug">
          {event.summary || '(No title)'}
        </p>
        <p className="text-xs text-stone-400 leading-snug">
          {isAllDay ? 'All day' : `${start} – ${end}`}
        </p>
      </div>
    </div>
  )
}

function DayView({ events }: { events: GCalEvent[] }) {
  const allDay = events.filter(e => !e.start.dateTime)
  const timed  = events.filter(e => !!e.start.dateTime)
  if (events.length === 0) {
    return <div className="flex items-center justify-center h-full text-stone-300 text-xs">No events</div>
  }
  return (
    <div className="flex flex-col overflow-y-auto">
      {allDay.map(e => <EventRow key={e.id} event={e} />)}
      {allDay.length > 0 && timed.length > 0 && <div className="border-b border-stone-100 mx-3 my-1" />}
      {timed.map(e => <EventRow key={e.id} event={e} />)}
    </div>
  )
}

function WeekView({ events, weekStart }: { events: GCalEvent[]; weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  return (
    <div className="flex flex-col overflow-y-auto divide-y divide-stone-100">
      {days.map(day => {
        const s = new Date(day); s.setHours(0, 0, 0, 0)
        const e = new Date(day); e.setHours(23, 59, 59, 999)
        const dayEvents = events.filter(ev => {
          const t = new Date(ev.start.dateTime ?? ev.start.date ?? '')
          return t >= s && t <= e
        })
        const isToday = day.toDateString() === today.toDateString()
        return (
          <div key={day.toISOString()} className={`flex gap-2 px-3 py-2 ${isToday ? 'bg-blue-50/60' : ''}`}>
            <div className="w-9 flex-shrink-0 text-right pt-0.5">
              <p className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-stone-400'}`}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-sm font-semibold leading-none ${isToday ? 'text-blue-600' : 'text-stone-500'}`}>
                {day.getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5 pt-0.5">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-stone-300">—</p>
              ) : (
                dayEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: eventColor(ev) }} />
                    <span className="text-stone-600 truncate flex-1">{ev.summary || '(No title)'}</span>
                    {ev.start.dateTime && (
                      <span className="text-stone-400 flex-shrink-0 text-xs">{formatTime(ev.start.dateTime)}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({ events, date }: { events: GCalEvent[]; date: Date }) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  // Monday-first offset
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
    <div className="flex flex-col h-full p-2 select-none">
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-stone-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const evs = dayEvents(day)
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          return (
            <div key={i} className={`rounded p-0.5 text-center min-h-0 ${isToday ? 'bg-blue-100' : 'hover:bg-stone-50'}`}>
              <p className={`text-xs font-medium leading-none mb-0.5 ${isToday ? 'text-blue-600' : 'text-stone-500'}`}>
                {day}
              </p>
              <div className="flex flex-wrap justify-center gap-px">
                {evs.slice(0, 3).map(e => (
                  <span key={e.id} className="w-1 h-1 rounded-full" style={{ background: eventColor(e) }} title={e.summary} />
                ))}
                {evs.length > 3 && (
                  <span className="text-stone-400 leading-none" style={{ fontSize: 8 }}>+{evs.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'month'

interface Props {
  calendarId: string
}

export function CalendarWidget({ calendarId }: Props) {
  const [view, setView]         = useState<View>('day')
  const [current, setCurrent]   = useState(new Date())

  // Compute time range and nav step based on view
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-red-500 text-xs p-4 text-center">
        <p>Failed to load events</p>
        <p className="text-red-400">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="underline hover:text-red-600">Retry</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-stone-100 flex-shrink-0">
        {/* View toggle */}
        <div className="flex rounded-md bg-stone-100 p-0.5 text-xs gap-px">
          {(['day', 'week', 'month'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 rounded capitalize font-medium transition-colors ${
                view === v ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Nav */}
        <IconButton icon={ChevronLeft} size="sm" onClick={() => navigate(-1)} />
        <span className="text-xs text-stone-500 font-medium flex-1 text-center truncate">{navLabel()}</span>
        <IconButton icon={ChevronRight} size="sm" onClick={() => navigate(1)} />

        <IconButton
          icon={RefreshCw}
          size="sm"
          onClick={() => refetch()}
          className={isFetching ? 'animate-spin text-blue-400' : ''}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-stone-400 text-xs">Loading…</div>
        ) : view === 'day' ? (
          <DayView events={events} />
        ) : view === 'week' ? (
          <WeekView events={events} weekStart={weekStart ?? weekRange(current).start} />
        ) : (
          <MonthView events={events} date={current} />
        )}
      </div>
    </div>
  )
}
