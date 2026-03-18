import { useEffect, useState } from 'react'
import { useWhiteboardStore } from '../../store/whiteboard'
import { Text } from '../../ui/web'
import { FlexCol, FlexRow } from '../../ui/layouts'
import { fontFamily } from '../../ui/theme'
import type { WidgetProps } from './registry'

export interface ClockWidgetSettings {
  display:     'digital' | 'analog'
  use24h:      boolean
  showSeconds: boolean
  showDate:    boolean
  font:        'thin' | 'mono' | 'serif'
}

export const DEFAULT_CLOCK_SETTINGS: ClockWidgetSettings = {
  display:     'digital',
  use24h:      false,
  showSeconds: true,
  showDate:    true,
  font:        'thin',
}

// Maps clock font setting to a fontFamily CSS value
const FONT_FAMILY: Record<ClockWidgetSettings['font'], string> = {
  thin:  fontFamily.base,
  mono:  fontFamily.mono,
  serif: fontFamily.display,
}

const FONT_WEIGHT: Record<ClockWidgetSettings['font'], string> = {
  thin:  '100',
  mono:  '300',
  serif: '300',
}

// ── Analog face ───────────────────────────────────────────────────────────────

function AnalogFace({ date }: { date: Date }) {
  const h = date.getHours() % 12
  const m = date.getMinutes()
  const s = date.getSeconds()

  const toRad   = (deg: number) => (deg - 90) * Math.PI / 180
  const handEnd = (angle: number, len: number) => ({
    x: 50 + len * Math.cos(angle),
    y: 50 + len * Math.sin(angle),
  })

  const hourPt   = handEnd(toRad((h + m / 60) * 30), 22)
  const minutePt = handEnd(toRad(m * 6), 32)
  const secondPt = handEnd(toRad(s * 6), 36)

  return (
    <svg viewBox="0 0 100 100" className="w-36 h-36">
      <circle cx="50" cy="50" r="47"
        style={{ fill: 'var(--wt-clock-face)', stroke: 'var(--wt-clock-stroke)' }}
        strokeWidth="1.5" />

      {Array.from({ length: 60 }, (_, i) => {
        const angle  = (i * 6 - 90) * Math.PI / 180
        const isHour = i % 5 === 0
        const r1     = isHour ? 40 : 43
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

      <line x1="50" y1="50" x2={hourPt.x} y2={hourPt.y}
        style={{ stroke: 'var(--wt-clock-hands)' }} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2={minutePt.x} y2={minutePt.y}
        style={{ stroke: 'var(--wt-clock-hands)' }} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="50" x2={secondPt.x} y2={secondPt.y}
        style={{ stroke: 'var(--wt-clock-second)' }} strokeWidth="1" strokeLinecap="round" />

      <circle cx="50" cy="50" r="3"   style={{ fill: 'var(--wt-clock-center)' }} />
      <circle cx="50" cy="50" r="1.5" style={{ fill: 'var(--wt-clock-second)' }} />
    </svg>
  )
}

// ── Digital face ──────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0') }

function DigitalFace({ date, settings }: { date: Date; settings: ClockWidgetSettings }) {
  const { use24h, showSeconds, font } = settings
  const rawH = date.getHours()
  const h    = use24h ? rawH : (rawH % 12 || 12)
  const m    = date.getMinutes()
  const s    = date.getSeconds()
  const ampm = rawH >= 12 ? 'PM' : 'AM'

  const ff = FONT_FAMILY[font]
  const fw = FONT_WEIGHT[font]

  return (
    <FlexRow align="baseline" justify="center" gap="sm">
      <Text
        as="span"
        variant="display"
        size="large"
        style={{ fontSize: '72px', lineHeight: '1', fontFamily: ff, fontWeight: fw, fontVariantNumeric: 'tabular-nums' }}
      >
        {pad(h)}:{pad(m)}
      </Text>
      <FlexCol align="start" className="gap-0.5 pb-0.5">
        {showSeconds && (
          <Text
            as="span"
            variant="heading"
            size="medium"
            color="muted"
            style={{ fontFamily: ff, fontWeight: fw, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}
          >
            {pad(s)}
          </Text>
        )}
        {!use24h && (
          <Text as="span" variant="label" size="medium" color="muted" style={{ lineHeight: '1' }}>
            {ampm}
          </Text>
        )}
      </FlexCol>
    </FlexRow>
  )
}

function DateDisplay({ date }: { date: Date }) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <FlexCol align="center" className="space-y-0.5">
      <Text variant="label" size="large" color="muted" align="center">{dayName}</Text>
      <Text variant="caption" size="large" color="muted" align="center" style={{ opacity: 0.7 }}>{dateStr}</Text>
    </FlexCol>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function ClockWidget({ widgetId }: WidgetProps) {
  const [now, setNow] = useState(new Date())

  const raw      = useWhiteboardStore((s) =>
    s.boards.find((b) => b.id === s.activeBoardId)?.widgets.find((w) => w.id === widgetId)?.settings
  )
  const settings: ClockWidgetSettings = { ...DEFAULT_CLOCK_SETTINGS, ...(raw ?? {}) } as ClockWidgetSettings

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <FlexCol align="center" justify="center" fullHeight noSelect gap="md" className="px-4">
      {settings.display === 'analog'
        ? <AnalogFace date={now} />
        : <DigitalFace date={now} settings={settings} />
      }
      {settings.showDate && <DateDisplay date={now} />}
    </FlexCol>
  )
}
