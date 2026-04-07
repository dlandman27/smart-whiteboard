import { useEffect, useRef, useState } from 'react'
import { Icon, IconButton } from '../../ui/web'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useNotificationStore } from '../../store/notifications'
import { Text, Input, SettingsSection } from '../../ui/web'
import { FlexCol, FlexRow } from '../../ui/layouts'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'work' | 'break' | 'longBreak'

export interface PomodoroSettings {
  workMinutes:          number
  breakMinutes:         number
  longBreakMinutes:     number
  cyclesBeforeLongBreak: number
}

const DEFAULTS: PomodoroSettings = {
  workMinutes:          25,
  breakMinutes:         5,
  longBreakMinutes:     15,
  cyclesBeforeLongBreak: 4,
}

const PHASE_LABELS: Record<Phase, string> = {
  work:      'Focus',
  break:     'Short Break',
  longBreak: 'Long Break',
}

const PHASE_COLORS: Record<Phase, string> = {
  work:      'var(--wt-accent)',
  break:     'var(--wt-success)',
  longBreak: 'var(--wt-info)',
}

function pad(n: number) { return String(n).padStart(2, '0') }

function phaseDuration(phase: Phase, s: PomodoroSettings): number {
  if (phase === 'work')      return s.workMinutes * 60
  if (phase === 'break')     return s.breakMinutes * 60
  return s.longBreakMinutes * 60
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function PomodoroWidget({ widgetId }: { widgetId: string }) {
  const [settings]        = useWidgetSettings<PomodoroSettings>(widgetId, DEFAULTS)
  const addNotification   = useNotificationStore((s) => s.addNotification)
  const dismissAllByWidget = useNotificationStore((s) => s.dismissAllByWidget)

  const [phase,        setPhase]        = useState<Phase>('work')
  const [timeLeft,     setTimeLeft]     = useState(() => DEFAULTS.workMinutes * 60)
  const [running,      setRunning]      = useState(false)
  const [cyclesCount,  setCyclesCount]  = useState(0)  // completed work cycles

  // Refs mirror state so the always-on interval always sees current values
  const phaseRef    = useRef(phase)
  const timeRef     = useRef(timeLeft)
  const runningRef  = useRef(running)
  const settingsRef = useRef(settings)
  const cyclesRef   = useRef(cyclesCount)

  phaseRef.current    = phase
  timeRef.current     = timeLeft
  runningRef.current  = running
  settingsRef.current = settings
  cyclesRef.current   = cyclesCount

  // Keep a stable ref to completePhase so the interval always calls the latest version
  const completePhaseRef = useRef<() => void>(() => {})

  // Single always-on interval — avoids effect re-runs on every running/phase change
  useEffect(() => {
    const id = setInterval(() => {
      if (!runningRef.current) return
      const next = timeRef.current - 1
      if (next <= 0) {
        completePhaseRef.current()
      } else {
        setTimeLeft(next)
      }
    }, 1000)
    return () => { clearInterval(id); dismissAllByWidget(widgetId) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  completePhaseRef.current = function completePhase() {
    const s = settingsRef.current
    const currentPhase = phaseRef.current
    let nextPhase: Phase
    let newCycles = cyclesRef.current

    if (currentPhase === 'work') {
      newCycles = cyclesRef.current + 1
      setCyclesCount(newCycles)
      nextPhase = newCycles % s.cyclesBeforeLongBreak === 0 ? 'longBreak' : 'break'
      addNotification({
        widgetId,
        title: 'Focus session complete!',
        body:  `Time for a ${nextPhase === 'longBreak' ? 'long break' : 'short break'}.`,
      })
    } else {
      nextPhase = 'work'
      addNotification({
        widgetId,
        title: 'Break over!',
        body:  'Ready to focus again?',
      })
    }

    setPhase(nextPhase)
    setTimeLeft(phaseDuration(nextPhase, s))
    setRunning(false)
  }

  function reset() {
    setRunning(false)
    setPhase('work')
    setCyclesCount(0)
    setTimeLeft(settingsRef.current.workMinutes * 60)
  }

  const total    = phaseDuration(phase, settings)
  const progress = 1 - timeLeft / total
  const minutes  = Math.floor(timeLeft / 60)
  const seconds  = timeLeft % 60
  const color    = PHASE_COLORS[phase]

  // SVG ring
  const R         = 56
  const CIRC      = 2 * Math.PI * R
  const dashOffset = CIRC * (1 - progress)

  return (
    <FlexCol align="center" justify="center" fullHeight noSelect className="gap-4 px-5">

      {/* Phase label */}
      <Text
        variant="label"
        size="small"
        color="muted"
        textTransform="uppercase"
        style={{ letterSpacing: '0.1em', opacity: 0.7 }}
      >
        {PHASE_LABELS[phase]}
      </Text>

      {/* Ring + time */}
      <div className="relative flex items-center justify-center">
        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={70} cy={70} r={R}
            fill="none"
            stroke="var(--wt-surface-subtle)"
            strokeWidth={6}
          />
          {/* Progress */}
          <circle
            cx={70} cy={70} r={R}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className="font-mono font-light tabular-nums"
            style={{ fontSize: 32, color: 'var(--wt-text)', letterSpacing: '0.02em' }}
          >
            {pad(minutes)}:{pad(seconds)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <FlexRow align="center" className="gap-3">
        <IconButton
          icon="ArrowCounterClockwise"
          variant="ghost"
          size="md"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={reset}
          title="Reset"
        />
        <button
          className="flex items-center justify-center rounded-full transition-all"
          style={{
            width: 44, height: 44,
            backgroundColor: color,
            color: 'var(--wt-accent-text)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setRunning((r) => !r)}
        >
          {running
            ? <Icon icon="Pause" size={18} weight="fill" />
            : <Icon icon="Play"  size={18} weight="fill" style={{ marginLeft: 2 }} />
          }
        </button>
        {/* Cycle dots */}
        <FlexRow align="center" className="gap-1" style={{ minWidth: 32 }}>
          {Array.from({ length: settings.cyclesBeforeLongBreak }).map((_, i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: 6, height: 6,
                backgroundColor: i < cyclesCount % settings.cyclesBeforeLongBreak
                  ? color
                  : 'var(--wt-surface-subtle)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </FlexRow>
      </FlexRow>

    </FlexCol>
  )
}

// ── Settings component ────────────────────────────────────────────────────────

export function PomodoroSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<PomodoroSettings>(widgetId, DEFAULTS)

  function field(label: string, key: keyof PomodoroSettings, min: number, max: number) {
    return (
      <Input
        label={label}
        type="number"
        size="sm"
        value={String(settings[key] as number)}
        onChange={(e) => update({ [key]: Math.max(min, Math.min(max, Number(e.target.value))) })}
      />
    )
  }

  return (
    <SettingsSection label="Durations">
      <div className="space-y-3">
        {field('Focus (minutes)',           'workMinutes',           1, 120)}
        {field('Short break (minutes)',     'breakMinutes',          1, 60)}
        {field('Long break (minutes)',      'longBreakMinutes',      1, 60)}
        {field('Cycles before long break',  'cyclesBeforeLongBreak', 1, 10)}
      </div>
    </SettingsSection>
  )
}
