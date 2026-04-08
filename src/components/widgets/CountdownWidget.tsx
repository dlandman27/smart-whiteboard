import { useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Text, Container, FlexCol, FlexRow, fontFamily, useWidgetSizeContext } from '@whiteboard/ui-kit'

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
  return <Container><CountdownContent widgetId={widgetId} /></Container>
}

function CountdownContent({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<CountdownSettings>(widgetId, DEFAULT_COUNTDOWN_SETTINGS)
  const [, tick]   = useState(0)
  const { containerWidth: containerW, containerHeight: containerH } = useWidgetSizeContext()

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const delta   = calcDelta(settings.targetDate)
  const isPast  = delta !== null && delta.total < 0
  const isToday = delta !== null && Math.abs(delta.total) < 86_400_000 && !isPast

  // Scale the big number to fill available space
  const daysSize = Math.max(48, Math.min(Math.round(containerW * 0.42), Math.round(containerH * 0.38), 140))
  const unitSize = Math.max(14, Math.round(daysSize * 0.28))
  const subSize  = Math.max(12, Math.round(containerW * 0.065))

  return (
    <FlexCol align="center" justify="center" fullHeight noSelect className="gap-2 px-5">
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
        <FlexCol align="center" gap="xs">
          <Text as="span" style={{ fontSize: Math.round(daysSize * 0.5) }}>🎉</Text>
          <Text variant="heading" size="large" color="accent">Today!</Text>
        </FlexCol>
      ) : (
        <>
          <FlexRow align="baseline" justify="center" className="gap-1.5">
            <Text
              as="span"
              style={{ fontSize: daysSize, fontWeight: '100', lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}
            >
              {delta!.days}
            </Text>
            <Text as="span" color="muted" style={{ fontSize: unitSize, fontWeight: '300' }}>
              {isPast
                ? (delta!.days === 1 ? 'day ago' : 'days ago')
                : (delta!.days === 1 ? 'day' : 'days')}
            </Text>
          </FlexRow>

          {settings.showTime && delta && (
            <Text
              color="muted"
              style={{ fontSize: subSize, fontFamily: fontFamily.mono, fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}
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
