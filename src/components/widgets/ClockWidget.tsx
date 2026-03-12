import { useEffect, useState } from 'react'
import { useWhiteboardStore } from '../../store/whiteboard'
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
      <circle cx="50" cy="50" r="47" fill="white" stroke="#e7e5e4" strokeWidth="1.5" />

      {/* Tick marks */}
      {Array.from({ length: 60 }, (_, i) => {
        const angle  = (i * 6 - 90) * Math.PI / 180
        const isHour = i % 5 === 0
        const r1     = isHour ? 40 : 43
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(angle)} y1={50 + r1 * Math.sin(angle)}
            x2={50 + 46 * Math.cos(angle)} y2={50 + 46 * Math.sin(angle)}
            stroke={isHour ? '#a8a29e' : '#d6d3d1'}
            strokeWidth={isHour ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        )
      })}

      {/* Hour hand */}
      <line x1="50" y1="50" x2={hourPt.x} y2={hourPt.y}
        stroke="#1c1917" strokeWidth="3.5" strokeLinecap="round" />

      {/* Minute hand */}
      <line x1="50" y1="50" x2={minutePt.x} y2={minutePt.y}
        stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" />

      {/* Second hand */}
      <line x1="50" y1="50" x2={secondPt.x} y2={secondPt.y}
        stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />

      <circle cx="50" cy="50" r="3"   fill="#1c1917" />
      <circle cx="50" cy="50" r="1.5" fill="#ef4444" />
    </svg>
  )
}

// ── Digital face ──────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, '0') }

const FONT_CLASS: Record<ClockWidgetSettings['font'], string> = {
  thin:  'font-thin',
  mono:  'font-mono font-light',
  serif: 'font-serif font-light',
}

function DigitalFace({ date, settings }: { date: Date; settings: ClockWidgetSettings }) {
  const { use24h, showSeconds, font } = settings
  const rawH  = date.getHours()
  const h     = use24h ? rawH : (rawH % 12 || 12)
  const m     = date.getMinutes()
  const s     = date.getSeconds()
  const ampm  = rawH >= 12 ? 'PM' : 'AM'
  const fCls  = FONT_CLASS[font]

  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className={`text-7xl tracking-tight text-stone-800 tabular-nums leading-none ${fCls}`}>
        {pad(h)}:{pad(m)}
      </span>
      <div className="flex flex-col items-start gap-0.5 pb-0.5">
        {showSeconds && (
          <span className={`text-2xl text-stone-400 tabular-nums leading-none ${fCls}`}>{pad(s)}</span>
        )}
        {!use24h && (
          <span className="text-xs font-medium text-stone-400 leading-none">{ampm}</span>
        )}
      </div>
    </div>
  )
}

function DateDisplay({ date }: { date: Date }) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="text-center space-y-0.5">
      <p className="text-stone-500 text-sm font-medium">{dayName}</p>
      <p className="text-stone-400 text-xs">{dateStr}</p>
    </div>
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
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none px-4">
      {settings.display === 'analog'
        ? <AnalogFace date={now} />
        : <DigitalFace date={now} settings={settings} />
      }
      {settings.showDate && <DateDisplay date={now} />}
    </div>
  )
}
