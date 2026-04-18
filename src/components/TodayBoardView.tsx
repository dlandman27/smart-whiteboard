import { useState, useEffect } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import {
  useGCalStatus, useGCalCalendars, useAllCalendarEvents,
  type GCalEvent, type GCalCalendar,
} from '../hooks/useGCal'
import { useWiigitTasks, useToggleWiigitTask, type WiigitTask } from '../hooks/useWiigitTasks'
import { useWeather, type WeatherData } from '../hooks/useWeather'
import { useRoutines, useRoutineCompletions, useToggleRoutine } from '../hooks/useRoutines'

// ── Quotes ───────────────────────────────────────────────────────────────────

// ── Background images (Unsplash, free to use) ───────────────────────────────

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // mountains
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80', // foggy forest
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80', // sunlit forest
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', // beach
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80', // green hills
  'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=1920&q=80', // ocean sunset
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1920&q=80', // misty mountains
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80', // lake sunset
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80', // dramatic peaks
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80', // waterfall
]

function dailyBg() {
  const day = Math.floor(Date.now() / 86_400_000)
  return BG_IMAGES[day % BG_IMAGES.length]
}

// ── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Focus is about saying no.', author: 'Steve Jobs' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Stay hungry, stay foolish.', author: 'Stewart Brand' },
  { text: 'Think different.', author: 'Apple' },
  { text: 'Measure twice, cut once.', author: 'Proverb' },
  { text: 'Less, but better.', author: 'Dieter Rams' },
]

function dailyQuote() {
  const day = Math.floor(Date.now() / 86_400_000)
  return QUOTES[day % QUOTES.length]
}

// ── Weather helpers ──────────────────────────────────────────────────────────

function getWeatherInfo(code: number): { label: string; icon: string } {
  if (code === 0)  return { label: 'Clear',         icon: 'Sun' }
  if (code === 1)  return { label: 'Mainly Clear',  icon: 'SunDim' }
  if (code === 2)  return { label: 'Partly Cloudy', icon: 'CloudSun' }
  if (code === 3)  return { label: 'Overcast',      icon: 'Cloud' }
  if (code <= 48)  return { label: 'Foggy',         icon: 'CloudFog' }
  if (code <= 57)  return { label: 'Drizzle',       icon: 'CloudDrizzle' }
  if (code <= 67)  return { label: 'Rain',          icon: 'CloudRain' }
  if (code <= 77)  return { label: 'Snow',          icon: 'CloudSnow' }
  if (code <= 86)  return { label: 'Showers',       icon: 'CloudRain' }
  return                   { label: 'Thunderstorm', icon: 'CloudLightning' }
}

// ── Time helpers ─────────────────────────────────────────────────────────────

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtTime(dt: string): string {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}


// ── Calendar color helpers ───────────────────────────────────────────────────

const GCAL_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#3f51b5',
  '9': '#0b8043', '10': '#d50000', '11': '#616161',
}

function eventColor(e: GCalEvent, calColors: Record<string, string>): string {
  if (e.colorId) return GCAL_COLORS[e.colorId] ?? '#4285f4'
  if (e._calendarId && calColors[e._calendarId]) return calColors[e._calendarId]
  return '#4285f4'
}

// ── Main component ───────────────────────────────────────────────────────────

export function TodayBoardView() {
  const [now, setNow] = useState(() => new Date())

  // Tick every 30 seconds (ambient, not real-time precision)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── Data hooks ──────────────────────────────────────────────────────────

  const { data: gcalStatus } = useGCalStatus()
  const { data: calendarsData } = useGCalCalendars()

  // Weather — use geolocation, fahrenheit default
  const { data: weather } = useWeather({ unit: 'fahrenheit', windUnit: 'mph', locationQuery: '' })

  // Calendar events for today
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const calendarIds = (calendarsData?.items ?? []).map((c: GCalCalendar) => c.id)

  const { data: allEvents } = useAllCalendarEvents(
    todayStart.toISOString(),
    todayEnd.toISOString(),
    gcalStatus?.connected && calendarIds.length > 0 ? calendarIds : [],
  )

  // Tasks
  const { data: allTasks } = useWiigitTasks()
  const toggleTask = useToggleWiigitTask()

  // Routines
  const today = now.toISOString().slice(0, 10)
  const { data: allRoutines = [] }     = useRoutines()
  const { data: completedIds = [] }    = useRoutineCompletions(today)
  const toggleRoutine = useToggleRoutine()

  // ── Process data ────────────────────────────────────────────────────────

  const calColors: Record<string, string> = {}
  for (const cal of calendarsData?.items ?? []) {
    if (cal.backgroundColor) calColors[cal.id] = cal.backgroundColor
  }

  // Upcoming events (not ended yet), sorted by start time, max 5
  const upcomingEvents = (allEvents ?? [])
    .filter(e => {
      if (!e.start.dateTime) return false
      const end = new Date(e.end.dateTime ?? e.start.dateTime)
      return end > now
    })
    .sort((a, b) => new Date(a.start.dateTime!).getTime() - new Date(b.start.dateTime!).getTime())
    .slice(0, 5)

  // Pending tasks, max 6
  const pendingTasks = (allTasks ?? [])
    .filter(t => t.status === 'needsAction')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)

  const hours  = now.getHours()
  const period = hours < 12 ? 'morning' : hours < 18 ? 'daily' : 'evening'
  const dailyRoutines  = allRoutines.filter(r => r.category === 'daily')
  const timePeriodRoutines = allRoutines.filter(r => r.category === period && r.category !== 'daily')
  const periodRoutines = period === 'daily' ? dailyRoutines : [...timePeriodRoutines, ...dailyRoutines]
  const routinesDone   = periodRoutines.filter(r => completedIds.includes(r.id)).length

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const quote = dailyQuote()

  const bgUrl = dailyBg()

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--wt-bg)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden',
    }}>

      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'opacity 1s ease',
      }} />

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* Content — force light text over photo */}
      <div style={{
        position: 'relative', flex: 1, display: 'grid',
        color: '#fff',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto 1fr auto',
        padding: '5vh 5vw',
        gap: '3vh 5vw',
        minHeight: 0,
      }}>

        {/* ── Top left: Greeting + Clock ───────────────────────────────── */}
        <div style={{ gridColumn: '1 / 2', alignSelf: 'start' }}>
          <div style={{
            fontSize: 'clamp(14px, 2vw, 18px)',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '1vh',
            letterSpacing: '0.02em',
          }}>
            {greeting(hours)}
          </div>
          <div style={{
            fontSize: 'clamp(64px, 12vw, 120px)',
            fontWeight: 200,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>
            {timeStr}
          </div>
          <div style={{
            fontSize: 'clamp(14px, 2vw, 20px)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.55)',
            marginTop: '1.5vh',
          }}>
            {dateStr}
          </div>
        </div>

        {/* ── Top right: Weather ────────────────────────────────────────── */}
        <div style={{ gridColumn: '2 / 3', alignSelf: 'start', textAlign: 'right' }}>
          {weather ? (
            <WeatherDisplay weather={weather} />
          ) : (
            <div style={{ opacity: 0.3, color: 'var(--wt-text-muted)', fontSize: 14 }}>
              Loading weather...
            </div>
          )}
        </div>

        {/* ── Middle left: Calendar events ──────────────────────────────── */}
        <div style={{
          gridColumn: '1 / 2', alignSelf: 'start', minHeight: 0,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '18px 20px',
        }}>
          <SectionLabel icon="CalendarBlank" label="Today's Schedule" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {upcomingEvents.length === 0 ? (
              <EmptyState text="No events today" />
            ) : (
              upcomingEvents.map(e => (
                <EventRow key={e.id} event={e} now={now} calColors={calColors} />
              ))
            )}
          </div>
        </div>

        {/* ── Middle right: Tasks + Routines ────────────────────────────── */}
        <div style={{ gridColumn: '2 / 3', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '2vh' }}>

          {/* Tasks */}
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '18px 20px',
          }}>
            <SectionLabel icon="CheckSquare" label="Tasks" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14 }}>
              {pendingTasks.length === 0 ? (
                <EmptyState text="All caught up" />
              ) : (
                pendingTasks.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggleTask.mutate({ id: t.id, completed: false })} />
                ))
              )}
            </div>
          </div>

          {/* Routines */}
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionLabel icon="Repeat" label="Routines" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {routinesDone}/{periodRoutines.length}
              </span>
            </div>
            {periodRoutines.length > 0 && (
              <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: routinesDone === periodRoutines.length ? '#4ade80' : 'rgba(255,255,255,0.5)',
                  width: `${(routinesDone / periodRoutines.length) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}

            {/* Period-specific routines */}
            {period !== 'daily' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 4, paddingLeft: 14 }}>
                  {period === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: timePeriodRoutines.length > 0 && dailyRoutines.length > 0 ? 8 : 0 }}>
                  {timePeriodRoutines.length === 0
                    ? <EmptyState text={`No ${period} routines`} />
                    : timePeriodRoutines.map(r => (
                        <TodayRoutineRow key={r.id} routine={r} completed={completedIds.includes(r.id)}
                          onToggle={() => toggleRoutine.mutate({ id: r.id, completed: completedIds.includes(r.id), date: today })} />
                      ))
                  }
                </div>
              </>
            )}

            {/* Daily routines */}
            {period !== 'daily' && dailyRoutines.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 4, paddingLeft: 14 }}>
                🔁 Daily
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dailyRoutines.length === 0 && period === 'daily'
                ? <EmptyState text="No routines — add some in the Routines board" />
                : dailyRoutines.map(r => (
                    <TodayRoutineRow key={r.id} routine={r} completed={completedIds.includes(r.id)}
                      onToggle={() => toggleRoutine.mutate({ id: r.id, completed: completedIds.includes(r.id), date: today })} />
                  ))
              }
            </div>
          </div>
        </div>

        {/* ── Bottom: Quote ─────────────────────────────────────────────── */}
        <div style={{
          gridColumn: '1 / -1', alignSelf: 'end',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <div style={{
            fontSize: 'clamp(12px, 1.5vw, 15px)',
            color: 'rgba(255,255,255,0.35)',
            fontStyle: 'italic',
            fontWeight: 300,
          }}>
            "{quote.text}" <span style={{ fontStyle: 'normal', opacity: 0.7 }}>— {quote.author}</span>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon icon={icon as any} size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
      <span style={{
        fontSize: 'clamp(11px, 1.3vw, 13px)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.4)',
      }}>
        {label}
      </span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: 'clamp(13px, 1.5vw, 16px)',
      color: 'rgba(255,255,255,0.3)',
      padding: '8px 0',
    }}>
      {text}
    </div>
  )
}

function WeatherDisplay({ weather }: { weather: WeatherData }) {
  const info = getWeatherInfo(weather.weatherCode)
  const sym = weather.unit === 'celsius' ? '°C' : '°F'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        <Icon icon={info.icon as any} size={36} style={{ color: 'rgba(255,255,255,0.6)' }} weight="duotone" />
        <span style={{
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 200,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 16px rgba(0,0,0,0.3)',
        }}>
          {weather.temperature}{sym}
        </span>
      </div>
      <div style={{
        fontSize: 'clamp(12px, 1.5vw, 15px)',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 6,
      }}>
        {info.label} · H:{weather.tempMax}° L:{weather.tempMin}°
      </div>
      <div style={{
        fontSize: 'clamp(11px, 1.2vw, 13px)',
        color: 'rgba(255,255,255,0.35)',
        marginTop: 2,
      }}>
        {weather.city}
      </div>
    </div>
  )
}

function EventRow({ event, now, calColors }: { event: GCalEvent; now: Date; calColors: Record<string, string> }) {
  const color = eventColor(event, calColors)
  const start = new Date(event.start.dateTime!)
  const end = new Date(event.end.dateTime ?? event.start.dateTime!)
  const isNow = start <= now && now <= end
  const isPast = end < now

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      borderRadius: 12,
      background: isNow ? 'rgba(255,255,255,0.08)' : 'transparent',
      borderLeft: isNow ? `3px solid ${color}` : '3px solid transparent',
      opacity: isPast ? 0.35 : 1,
      transition: 'all 0.3s',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <span style={{
        fontSize: 'clamp(12px, 1.4vw, 15px)',
        color: 'rgba(255,255,255,0.55)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
        minWidth: 80,
      }}>
        {fmtTime(event.start.dateTime!)}
      </span>
      <span style={{
        fontSize: 'clamp(13px, 1.5vw, 16px)',
        color: '#fff',
        fontWeight: isNow ? 600 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}>
        {event.summary ?? '(No title)'}
      </span>
      {isNow && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: '#fff', marginLeft: 'auto', flexShrink: 0,
          background: color, padding: '2px 8px', borderRadius: 6,
        }}>
          NOW
        </span>
      )}
    </div>
  )
}

function TodayRoutineRow({ routine, completed, onToggle }: {
  routine: { id: string; emoji: string; title: string }
  completed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderRadius: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: completed ? 'none' : '2px solid rgba(255,255,255,0.4)',
        background: completed ? 'rgba(255,255,255,0.8)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {completed && (
          <svg width={10} height={10} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{routine.emoji}</span>
      <span style={{
        fontSize: 'clamp(13px, 1.4vw, 15px)', color: completed ? 'rgba(255,255,255,0.35)' : '#fff',
        fontWeight: 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: completed ? 'line-through' : 'none', transition: 'color 0.15s',
        textShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}>
        {routine.title}
      </span>
    </button>
  )
}

function TaskRow({ task, onToggle }: { task: WiigitTask; onToggle: () => void }) {
  const hasDue = !!task.due
  const isOverdue = hasDue && new Date(task.due!) < new Date()
  const PRIORITY_COLORS = ['', '#ef4444', '#f97316', '#facc15', 'rgba(255,255,255,0.2)'] as const

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', borderRadius: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: `2px solid ${PRIORITY_COLORS[task.priority] ?? 'rgba(255,255,255,0.3)'}`,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 'clamp(13px, 1.5vw, 16px)',
        color: '#fff', fontWeight: 400, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}>
        {task.title || '(No title)'}
      </span>
      {hasDue && (
        <span style={{
          fontSize: 'clamp(10px, 1.1vw, 12px)',
          color: isOverdue ? '#ff6b6b' : 'rgba(255,255,255,0.45)',
          fontWeight: isOverdue ? 600 : 400, flexShrink: 0,
        }}>
          {new Date(task.due!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </button>
  )
}
