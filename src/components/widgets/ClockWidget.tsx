import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, useWidgetSizeContext, fontFamily, FlexRow, FlexCol, Text } from '@whiteboard/ui-kit'
import type { WidgetProps } from './registry'

export interface ClockWidgetSettings {
  display:          'digital' | 'analog'
  use24h:           boolean
  showSeconds:      boolean
  showDate:         boolean
  font:             'thin' | 'mono' | 'serif'
  timezone:         string   // IANA string e.g. 'America/New_York', '' = local
  showTimezone:     boolean
  showHourNumbers:  boolean  // analog only
}

export const DEFAULT_CLOCK_SETTINGS: ClockWidgetSettings = {
  display:         'digital',
  use24h:          false,
  showSeconds:     true,
  showDate:        true,
  font:            'thin',
  timezone:        '',
  showTimezone:    false,
  showHourNumbers: false,
}

const FONT_FAMILY: Record<ClockWidgetSettings['font'], string> = {
  thin:  fontFamily.base,
  mono:  fontFamily.mono,
  serif: fontFamily.display,
}

const FONT_WEIGHT: Record<ClockWidgetSettings['font'], string> = {
  thin:  '300',
  mono:  '300',
  serif: '400',
}

function pad(n: number) { return n.toString().padStart(2, '0') }

// ── Timezone helpers ──────────────────────────────────────────────────────────

function getTimeParts(tz: string): { h: number; m: number; s: number; ms: number } {
  const now = new Date()
  if (!tz) {
    return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds(), ms: now.getMilliseconds() }
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(now)
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0')
    return { h: get('hour') % 24, m: get('minute'), s: get('second'), ms: now.getMilliseconds() }
  } catch {
    return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds(), ms: now.getMilliseconds() }
  }
}

function getDateParts(tz: string): { dayName: string; dateStr: string } {
  const now = new Date()
  const opts: Intl.DateTimeFormatOptions = tz ? { timeZone: tz } : {}
  return {
    dayName: now.toLocaleDateString('en-US', { ...opts, weekday: 'long' }),
    dateStr: now.toLocaleDateString('en-US', { ...opts, month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

function getTzLabel(tz: string): string {
  if (!tz) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz
  } catch {
    return tz
  }
}

// ── Analog face ───────────────────────────────────────────────────────────────

function AnalogFace({ h, m, s, ms, showNumbers }: {
  h: number; m: number; s: number; ms: number; showNumbers: boolean
}) {
  const toRad   = (deg: number) => (deg - 90) * Math.PI / 180
  const handEnd = (angle: number, len: number) => ({
    x: 50 + len * Math.cos(angle),
    y: 50 + len * Math.sin(angle),
  })

  // Smooth second hand using milliseconds
  const smoothS  = s + ms / 1000
  const hourPt   = handEnd(toRad((h % 12 + m / 60) * 30), 22)
  const minutePt = handEnd(toRad(m * 6 + s / 10), 32)
  const secondPt = handEnd(toRad(smoothS * 6), 36)

  const HOUR_POSITIONS = [
    { n: 12, x: 50,    y: 10   },
    { n:  3, x: 90,    y: 50   },
    { n:  6, x: 50,    y: 90   },
    { n:  9, x: 10,    y: 50   },
  ]

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      {/* Face */}
      <circle cx="50" cy="50" r="47"
        style={{ fill: 'var(--wt-clock-face)', stroke: 'var(--wt-clock-stroke)' }}
        strokeWidth="1.5" />

      {/* Tick marks */}
      {Array.from({ length: 60 }, (_, i) => {
        const angle  = (i * 6 - 90) * Math.PI / 180
        const isHour = i % 5 === 0
        const r1     = isHour ? 39 : 43
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(angle)} y1={50 + r1 * Math.sin(angle)}
            x2={50 + 46 * Math.cos(angle)} y2={50 + 46 * Math.sin(angle)}
            style={{ stroke: isHour ? 'var(--wt-clock-tick-major)' : 'var(--wt-clock-tick-minor)' }}
            strokeWidth={isHour ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        )
      })}

      {/* Hour numbers */}
      {showNumbers && HOUR_POSITIONS.map(({ n, x, y }) => (
        <text
          key={n}
          x={x} y={y}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: 'var(--wt-clock-tick-major)', fontFamily: fontFamily.base, fontSize: 7, fontWeight: 500 }}
        >
          {n}
        </text>
      ))}

      {/* Hands */}
      <line x1="50" y1="50" x2={hourPt.x}   y2={hourPt.y}
        style={{ stroke: 'var(--wt-clock-hands)' }} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2={minutePt.x} y2={minutePt.y}
        style={{ stroke: 'var(--wt-clock-hands)' }} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2={secondPt.x} y2={secondPt.y}
        style={{ stroke: 'var(--wt-clock-second)' }} strokeWidth="1" strokeLinecap="round" />

      {/* Center dot */}
      <circle cx="50" cy="50" r="3"   style={{ fill: 'var(--wt-clock-center)' }} />
      <circle cx="50" cy="50" r="1.5" style={{ fill: 'var(--wt-clock-second)' }} />
    </svg>
  )
}

// ── Digital face ──────────────────────────────────────────────────────────────

function DigitalFace({ h, m, s, settings, containerW }: {
  h: number; m: number; s: number
  settings: ClockWidgetSettings
  containerW: number
}) {
  const { use24h, showSeconds, font } = settings
  const displayH = use24h ? h : (h % 12 || 12)
  const ampm     = h >= 12 ? 'PM' : 'AM'

  const ff = FONT_FAMILY[font]
  const fw = FONT_WEIGHT[font]

  // Responsive sizing based on container width
  const timeSize = Math.max(32, Math.round(containerW * 0.28))
  const subSize  = Math.max(16, Math.round(containerW * 0.09))
  const ampmSize = Math.max(11, Math.round(containerW * 0.065))

  return (
    <FlexRow
      align="baseline"
      justify="center"
      style={{ gap: Math.round(containerW * 0.02) }}
    >
      <Text
        as="span"
        style={{
          fontSize:           timeSize,
          lineHeight:         1,
          fontFamily:         ff,
          fontWeight:         fw,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing:      font === 'mono' ? '-0.02em' : '-0.03em',
        }}
      >
        {pad(displayH)}:{pad(m)}
      </Text>

      {(showSeconds || !use24h) && (
        <FlexCol align="start" style={{ gap: 2, paddingBottom: 2 }}>
          {showSeconds && (
            <Text
              as="span"
              color="muted"
              style={{
                fontSize:           subSize,
                lineHeight:         1,
                fontFamily:         ff,
                fontWeight:         fw,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pad(s)}
            </Text>
          )}
          {!use24h && (
            <Text
              as="span"
              color="muted"
              style={{
                fontSize:      ampmSize,
                lineHeight:    1,
                fontFamily:    fontFamily.base,
                fontWeight:    '500',
                letterSpacing: '0.04em',
              }}
            >
              {ampm}
            </Text>
          )}
        </FlexCol>
      )}
    </FlexRow>
  )
}

// ── Date display ──────────────────────────────────────────────────────────────

function DateDisplay({ timezone, containerW }: { timezone: string; containerW: number }) {
  const { dayName, dateStr } = getDateParts(timezone)
  const daySize  = Math.max(11, Math.round(containerW * 0.055))
  const dateSize = Math.max(10, Math.round(containerW * 0.045))

  return (
    <FlexCol align="center" gap="none">
      <Text as="span" color="muted" style={{ fontSize: daySize, fontWeight: 500, fontFamily: fontFamily.base, lineHeight: 1.3 }}>
        {dayName}
      </Text>
      <Text as="span" color="muted" style={{ fontSize: dateSize, fontWeight: 400, fontFamily: fontFamily.base, opacity: 0.65, lineHeight: 1.3 }}>
        {dateStr}
      </Text>
    </FlexCol>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function ClockWidget({ widgetId }: WidgetProps) {
  return <Container><ClockContent widgetId={widgetId} /></Container>
}

function ClockContent({ widgetId }: WidgetProps) {
  const [settings] = useWidgetSettings<ClockWidgetSettings>(widgetId, DEFAULT_CLOCK_SETTINGS)
  const [tick,     setTick]     = useState(0)
  const { containerWidth: containerW, containerHeight: containerH } = useWidgetSizeContext()
  const rafRef = useRef<number | null>(null)

  // Use rAF for smooth analog second hand; tick every ~16ms
  useEffect(() => {
    let last = 0
    function frame(ts: number) {
      // Only re-render at most ~30fps to avoid excess work
      if (ts - last >= 33) { last = ts; setTick((n) => n + 1) }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  void tick  // consumed by rAF to trigger re-renders
  const { h, m, s, ms } = getTimeParts(settings.timezone)
  const tzLabel = settings.showTimezone ? getTzLabel(settings.timezone) : ''

  // Analog clock size: square, fill most of the container
  const analogSize = Math.min(containerW * 0.78, containerH * (settings.showDate ? 0.6 : 0.78))

  return (
    <Container
      className="flex flex-col items-center justify-center px-4 py-3"
      style={{ gap: Math.round(containerH * 0.05) }}
    >
      {settings.display === 'analog' ? (
        <div style={{ width: analogSize, height: analogSize, flexShrink: 0 }}>
          <AnalogFace h={h} m={m} s={s} ms={ms} showNumbers={settings.showHourNumbers} />
        </div>
      ) : (
        <DigitalFace h={h} m={m} s={s} settings={settings} containerW={containerW} />
      )}

      {settings.showDate && (
        <DateDisplay timezone={settings.timezone} containerW={containerW} />
      )}

      {tzLabel && (
        <Text
          as="span"
          color="accent"
          textTransform="uppercase"
          style={{
            fontSize:      Math.max(9, Math.round(containerW * 0.04)),
            fontWeight:    500,
            fontFamily:    fontFamily.base,
            letterSpacing: '0.06em',
            opacity:       0.8,
            lineHeight:    1,
          }}
        >
          {tzLabel}
        </Text>
      )}
    </Container>
  )
}
