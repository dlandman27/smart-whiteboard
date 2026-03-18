import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Text } from '../../ui/web'
import { FlexCol, FlexRow } from '../../ui/layouts'

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
  const target = new Date(`${targetDate}T00:00:00`)
  if (isNaN(target.getTime())) return null

  const total   = target.getTime() - Date.now()
  const abs     = Math.abs(total)
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

  const delta   = calcDelta(settings.targetDate)
  const isPast  = delta !== null && delta.total < 0
  const isToday = delta !== null && Math.abs(delta.total) < 86_400_000 && !isPast

  return (
    <FlexCol align="center" justify="center" fullHeight noSelect className="gap-3 px-5">
      <Text
        variant="label"
        size="small"
        color="muted"
        textTransform="uppercase"
        style={{ letterSpacing: '0.1em', opacity: 0.7 }}
      >
        {settings.title || 'Countdown'}
      </Text>

      {!settings.targetDate ? (
        <Text variant="body" size="small" color="muted">Set a date in settings</Text>
      ) : isToday ? (
        <FlexCol align="center" className="gap-1">
          <Text as="span" style={{ fontSize: '48px' }}>🎉</Text>
          <Text variant="heading" size="large" color="accent">Today!</Text>
        </FlexCol>
      ) : (
        <>
          <FlexRow align="baseline" className="gap-1.5">
            <Text
              as="span"
              variant="display"
              size="large"
              style={{ fontSize: '96px', fontWeight: '100', lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}
            >
              {delta!.days}
            </Text>
            <Text as="span" variant="body" size="large" color="muted" style={{ fontWeight: '300' }}>
              {isPast
                ? (delta!.days === 1 ? 'day ago' : 'days ago')
                : (delta!.days === 1 ? 'day' : 'days')}
            </Text>
          </FlexRow>

          {settings.showTime && delta && (
            <Text
              variant="heading"
              size="small"
              color="muted"
              style={{ fontFamily: 'monospace', fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}
            >
              {pad(delta.hours)}:{pad(delta.minutes)}:{pad(delta.seconds)}
            </Text>
          )}

          {settings.targetDate && (
            <Text variant="caption" size="small" color="muted" style={{ opacity: 0.5 }}>
              {new Date(`${settings.targetDate}T00:00:00`).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
          )}
        </>
      )}
    </FlexCol>
  )
}
