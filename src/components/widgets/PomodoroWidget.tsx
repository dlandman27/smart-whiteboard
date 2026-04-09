import React, { useEffect, useRef, useState } from 'react'
import { Icon, IconButton, Container, Text, Input, SettingsSection, FlexCol, FlexRow, useWidgetSizeContext } from '@whiteboard/ui-kit'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useNotificationStore } from '../../store/notifications'

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
  return <Container><PomodoroContent widgetId={widgetId} /></Container>
}

function PomodoroContent({ widgetId }: { widgetId: string }) {
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

  const { containerWidth: containerW, containerHeight: containerH } = useWidgetSizeContext()

  const total    = phaseDuration(phase, settings)
  const progress = 1 - timeLeft / total
  const minutes  = Math.floor(timeLeft / 60)
  const seconds  = timeLeft % 60
  const color    = PHASE_COLORS[phase]

  const isWide = containerW / containerH > 1.1

  // Ring fills more of the height in wide mode
  const ringSize   = isWide
    ? Math.max(60,  Math.min(containerH * 0.82, containerW * 0.42, 260))
    : Math.max(80,  Math.min(containerW * 0.62, containerH * 0.44, 240))
  const R          = ringSize * 0.4
  const CIRC       = 2 * Math.PI * R
  const dashOffset = CIRC * (1 - progress)
  const timeSize   = Math.max(16, Math.round(ringSize * 0.22))
  const playSize   = Math.max(36, Math.round(ringSize * 0.38))
  const iconSize   = Math.max(14, Math.round(playSize * 0.42))
  const cx         = ringSize / 2
  const cy         = ringSize / 2

  const ring = (
    <div className="relative flex items-center justify-center flex-shrink-0">
      <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--wt-surface-subtle)" strokeWidth={Math.max(4, ringSize * 0.043)} />
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(4, ringSize * 0.043)}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
        />
      </svg>
      <Text
        className="absolute font-mono font-light tabular-nums"
        style={{ fontSize: timeSize, letterSpacing: '0.02em' }}
      >
        {pad(minutes)}:{pad(seconds)}
      </Text>
    </div>
  )

  const cycleDots = (
    <FlexRow align="center" justify="center" gap="xs">
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
  )

  const playControls = (
    <FlexRow align="center" justify="center" gap="md">
      <IconButton
        icon="ArrowCounterClockwise"
        size="lg"
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        onClick={reset}
        title="Reset"
      />
      <button
        className="flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: playSize, height: playSize,
          backgroundColor: color,
          color: 'var(--wt-accent-text)',
          border: 'none',
          boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
          flexShrink: 0,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setRunning((r) => !r)}
      >
        {running
          ? <Icon icon="Pause" size={iconSize} weight="fill" />
          : <Icon icon="Play"  size={iconSize} weight="fill" style={{ marginLeft: 2 }} />
        }
      </button>
      <IconButton
        icon="SkipForward"
        size="lg"
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        onClick={() => completePhaseRef.current()}
        title="Skip phase"
        variant="ghost"
      />
    </FlexRow>
  )

  if (isWide) {
    const inset = Math.round(containerH * 0.1)
    return (
      <FlexRow
        align="center"
        justify="center"
        fullHeight
        noSelect
        style={{ padding: `${inset}px ${Math.round(containerW * 0.06)}px`, gap: Math.round(containerW * 0.05) }}
      >
        {ring}
        {/* Right panel: label top, controls center, dots bottom — pinned to ring height */}
        <FlexCol
          align="center"
          justify="between"
          style={{ height: ringSize, flex: 1 }}
        >
          <Text
            variant="label"
            size="small"
            color="muted"
            textTransform="uppercase"
            style={{ letterSpacing: '0.12em', opacity: 0.6 }}
          >
            {PHASE_LABELS[phase]}
          </Text>
          {playControls}
          {cycleDots}
        </FlexCol>
      </FlexRow>
    )
  }

  return (
    <FlexCol align="center" justify="center" fullHeight noSelect className="gap-3 px-5">
      <Text
        variant="label"
        size="small"
        color="muted"
        textTransform="uppercase"
        style={{ letterSpacing: '0.1em', opacity: 0.7 }}
      >
        {PHASE_LABELS[phase]}
      </Text>
      {ring}
      <FlexCol align="center" gap="xs">
        {playControls}
        {cycleDots}
      </FlexCol>
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
      <FlexCol gap="sm">
        {field('Focus (minutes)',           'workMinutes',           1, 120)}
        {field('Short break (minutes)',     'breakMinutes',          1, 60)}
        {field('Long break (minutes)',      'longBreakMinutes',      1, 60)}
        {field('Cycles before long break',  'cyclesBeforeLongBreak', 1, 10)}
      </FlexCol>
    </SettingsSection>
  )
}
