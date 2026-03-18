import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

export interface CountdownSettings {
  title:      string
  targetDate: string   // ISO date string, e.g. "2025-12-25"
  showTime:   boolean  // show live H:M:S beneath days
}

export const DEFAULT_COUNTDOWN_SETTINGS: CountdownSettings = {
  title:      'Countdown',
  targetDate: '',
  showTime:   true,
}

// ── Time math ─────────────────────────────────────────────────────────────────

interface Delta {
  total:   number   // ms, can be negative (past)
  days:    number
  hours:   number
  minutes: number
  seconds: number
}

function calcDelta(targetDate: string): Delta | null {
  if (!targetDate) return null
  // Treat the date as midnight local time
  const target = new Date(`${targetDate}T00:00:00`)
  if (isNaN(target.getTime())) return null

  const total  = target.getTime() - Date.now()
  const abs    = Math.abs(total)
  const days    = Math.floor(abs / 86_400_000)
  const hours   = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const seconds = Math.floor((abs % 60_000) / 1_000)
  return { total, days, hours, minutes, seconds }
}

function pad(n: number) { return n.toString().padStart(2, '0') }

// ── Widget ────────────────────────────────────────────────────────────────────

export function CountdownWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<CountdownSettings>(widgetId, DEFAULT_COUNTDOWN_SETTINGS)
  const [, tick]   = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const delta = calcDelta(settings.targetDate)
  const isPast    = delta !== null && delta.total < 0
  const isToday   = delta !== null && Math.abs(delta.total) < 86_400_000 && !isPast

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 select-none px-5"
      style={{ color: 'var(--wt-text)' }}
    >
      {/* Title */}
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--wt-text-muted)', opacity: 0.7 }}>
        {settings.title || 'Countdown'}
      </p>

      {!settings.targetDate ? (
        <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>Set a date in settings</p>
      ) : isToday ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl">🎉</span>
          <p className="text-xl font-semibold" style={{ color: 'var(--wt-accent)' }}>Today!</p>
        </div>
      ) : (
        <>
          {/* Days */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-8xl font-thin tabular-nums leading-none" style={{ color: 'var(--wt-text)' }}>
              {isPast ? delta!.days : delta!.days}
            </span>
            <span className="text-lg font-light" style={{ color: 'var(--wt-text-muted)' }}>
              {isPast ? (delta!.days === 1 ? 'day ago' : 'days ago') : (delta!.days === 1 ? 'day' : 'days')}
            </span>
          </div>

          {/* H:M:S */}
          {settings.showTime && delta && (
            <p className="text-xl font-mono font-light tabular-nums" style={{ color: 'var(--wt-text-muted)' }}>
              {pad(delta.hours)}:{pad(delta.minutes)}:{pad(delta.seconds)}
            </p>
          )}

          {/* Target date label */}
          {settings.targetDate && (
            <p className="text-xs" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}>
              {new Date(`${settings.targetDate}T00:00:00`).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
