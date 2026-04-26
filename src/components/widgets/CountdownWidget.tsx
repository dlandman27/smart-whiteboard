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
  const [settings, set] = useWidgetSettings<CountdownSettings>(widgetId, DEFAULT_COUNTDOWN_SETTINGS)
  const [, tick]   = useState(0)
  const { containerWidth: containerW, containerHeight: containerH } = useWidgetSizeContext()

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const delta   = calcDelta(settings.targetDate)
  const isPast  = delta !== null && delta.total < 0
  const isToday = delta !== null && Math.abs(delta.total) < 86_400_000 && !isPast
  const isWide  = containerW / containerH > 1.1

  // Portrait: scale number off both dims. Wide: scale off height only.
  const daysSize = isWide
    ? Math.max(48, Math.min(Math.round(containerH * 0.52), 140))
    : Math.max(48, Math.min(Math.round(containerW * 0.42), Math.round(containerH * 0.38), 140))
  const unitSize = Math.max(14, Math.round(daysSize * 0.28))
  const subSize  = Math.max(12, Math.round(isWide ? containerH * 0.1 : containerW * 0.065))
  const dateSize = Math.max(10, Math.round(isWide ? containerH * 0.075 : containerW * 0.048))

  const numberBlock = !settings.targetDate ? (
    <FlexCol align="center" gap="sm" style={{ width: '100%', paddingLeft: 8, paddingRight: 8 }}>
      <input
        type="date"
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => set({ targetDate: e.target.value })}
        style={{
          fontSize: 15, padding: '8px 12px', borderRadius: 10,
          border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
          color: 'var(--wt-text)', outline: 'none', cursor: 'pointer', width: '100%',
        }}
      />
      <Text variant="caption" size="small" color="muted" style={{ opacity: 0.5 }}>Pick a date to start counting</Text>
    </FlexCol>
  ) : isToday ? (
    <FlexCol align="center" gap="xs">
      <Text as="span" style={{ fontSize: Math.round(daysSize * 0.5) }}>🎉</Text>
      <Text variant="heading" size="large" color="accent">Today!</Text>
    </FlexCol>
  ) : (
    <FlexRow align="baseline" justify="center" className="gap-1.5">
      <Text
        as="span"
        style={{ fontSize: daysSize, fontWeight: '200', lineHeight: '1', fontVariantNumeric: 'tabular-nums', color: 'var(--wt-accent)' }}
      >
        {delta!.days}
      </Text>
      <Text as="span" color="muted" style={{ fontSize: unitSize, fontWeight: '300' }}>
        {isPast
          ? (delta!.days === 1 ? 'day ago' : 'days ago')
          : (delta!.days === 1 ? 'day' : 'days')}
      </Text>
    </FlexRow>
  )

  if (isWide && settings.targetDate && !isToday) {
    const inset = Math.round(containerH * 0.12)
    return (
      <FlexRow
        align="center"
        justify="center"
        fullHeight
        noSelect
        style={{ padding: `${inset}px ${Math.round(containerW * 0.06)}px`, gap: Math.round(containerW * 0.05) }}
      >
        {numberBlock}
        <FlexCol
          align="center"
          justify="between"
          style={{ height: daysSize * 1.4, flex: 1 }}
        >
          <Text
            variant="label"
            size="small"
            color="muted"
            textTransform="uppercase"
            style={{ letterSpacing: '0.12em', opacity: 0.6 }}
          >
            {settings.title || 'Countdown'}
          </Text>

          {settings.showTime && delta && (
            <Text
              color="muted"
              style={{ fontSize: subSize, fontFamily: fontFamily.mono, fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}
            >
              {pad(delta.hours)}:{pad(delta.minutes)}:{pad(delta.seconds)}
            </Text>
          )}

          <Text color="muted" style={{ fontSize: dateSize, opacity: 0.5 }}>
            {new Date(`${settings.targetDate}T00:00:00`).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </FlexCol>
      </FlexRow>
    )
  }

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

      {numberBlock}

      {!isToday && settings.showTime && delta && (
        <Text
          color="muted"
          style={{ fontSize: subSize, fontFamily: fontFamily.mono, fontWeight: '300', fontVariantNumeric: 'tabular-nums' }}
        >
          {pad(delta.hours)}:{pad(delta.minutes)}:{pad(delta.seconds)}
        </Text>
      )}

      {!isToday && settings.targetDate && (
        <Text variant="caption" size="small" color="muted" style={{ opacity: 0.5 }}>
          {new Date(`${settings.targetDate}T00:00:00`).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
        </Text>
      )}
    </FlexCol>
  )
}
