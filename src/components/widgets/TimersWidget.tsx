import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, FlexCol, FlexRow, Text, Input, IconButton, Center, ScrollArea, Button } from '@whiteboard/ui-kit'
import type { WidgetProps } from './registry'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Timer {
  id:               string
  label:            string
  durationSeconds:  number
  remainingSeconds: number
  isRunning:        boolean
}

interface TimerSettings {
  timers: Timer[]
}

const DEFAULT_TIMER_SETTINGS: TimerSettings = { timers: [] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function parseMmSs(value: string): number {
  const parts = value.split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0]) || 0
    const s = parseInt(parts[1]) || 0
    return m * 60 + s
  }
  return parseInt(value) * 60 || 0
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function TimersWidget({ widgetId }: WidgetProps) {
  const [settings, update] = useWidgetSettings<TimerSettings>(widgetId, DEFAULT_TIMER_SETTINGS)
  const [newLabel, setNewLabel]       = useState('')
  const [newDuration, setNewDuration] = useState('5:00')
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    const id = setInterval(() => {
      const current = settingsRef.current.timers
      const anyRunning = current.some((t) => t.isRunning && t.remainingSeconds > 0)
      if (!anyRunning) return
      update({
        timers: current.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t
          const next = t.remainingSeconds - 1
          return { ...t, remainingSeconds: next, isRunning: next > 0 }
        }),
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addTimer() {
    const duration = parseMmSs(newDuration)
    if (!duration) return
    const timer: Timer = {
      id:               genId(),
      label:            newLabel.trim() || 'Timer',
      durationSeconds:  duration,
      remainingSeconds: duration,
      isRunning:        false,
    }
    update({ timers: [...settings.timers, timer] })
    setNewLabel('')
    setNewDuration('5:00')
  }

  function toggleTimer(id: string) {
    update({
      timers: settings.timers.map((t) =>
        t.id === id ? { ...t, isRunning: !t.isRunning } : t,
      ),
    })
  }

  function resetTimer(id: string) {
    update({
      timers: settings.timers.map((t) =>
        t.id === id ? { ...t, remainingSeconds: t.durationSeconds, isRunning: false } : t,
      ),
    })
  }

  function deleteTimer(id: string) {
    update({ timers: settings.timers.filter((t) => t.id !== id) })
  }

  const timers = settings.timers

  return (
    <Container className="flex flex-col overflow-hidden">
      {/* Add timer form */}
      <FlexRow
        align="center"
        gap="xs"
        className="p-3 flex-shrink-0 border-b"
        style={{ borderColor: 'var(--wt-border)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label"
          size="sm"
          className="flex-1 min-w-0"
          onPointerDown={(e) => e.stopPropagation()}
        />
        <Input
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          placeholder="MM:SS"
          size="sm"
          className="text-center"
          style={{ width: 64 }}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <Button
          variant="accent"
          size="sm"
          onClick={addTimer}
          className="flex-shrink-0"
        >
          Add
        </Button>
      </FlexRow>

      {/* Timer list */}
      <ScrollArea className="p-3 settings-scroll">
        <FlexCol gap="xs">
          {timers.length === 0 && (
            <Center fullHeight className="py-8 opacity-40">
              <Text variant="body" size="small" color="muted">No timers yet. Add one above.</Text>
            </Center>
          )}

          {timers.map((t) => {
            const progress = t.durationSeconds > 0 ? t.remainingSeconds / t.durationSeconds : 0
            const done     = t.remainingSeconds <= 0
            const CIRC     = 2 * Math.PI * 15
            const countdownColor = done
              ? 'var(--wt-success)'
              : t.remainingSeconds < 60
                ? 'var(--wt-accent)'
                : 'var(--wt-text)'

            return (
              <FlexRow
                key={t.id}
                align="center"
                gap="sm"
                className="rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'var(--wt-settings-divider)' }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Progress arc */}
                <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="var(--wt-border)" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                    stroke={done ? 'var(--wt-success)' : 'var(--wt-accent)'}
                    strokeDasharray={String(CIRC)}
                    strokeDashoffset={String(CIRC * (1 - progress))}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>

                {/* Label */}
                <Text variant="label" size="small" className="flex-1 min-w-0 truncate">
                  {t.label}
                </Text>

                {/* Countdown */}
                <Text
                  variant="heading"
                  size="small"
                  className="font-mono tabular-nums flex-shrink-0"
                  style={{ color: countdownColor }}
                >
                  {formatCountdown(t.remainingSeconds)}
                </Text>

                {/* Controls */}
                <FlexRow align="center" gap="xs" className="flex-shrink-0">
                  <IconButton
                    icon={t.isRunning ? 'Pause' : 'Play'}
                    size="sm"
                    weight="fill"
                    disabled={done}
                    onClick={() => toggleTimer(t.id)}
                    title={t.isRunning ? 'Pause' : 'Start'}
                  />
                  <IconButton
                    icon="ArrowCounterClockwise"
                    size="sm"
                    onClick={() => resetTimer(t.id)}
                    title="Reset"
                  />
                  <IconButton
                    icon="X"
                    size="sm"
                    onClick={() => deleteTimer(t.id)}
                    title="Delete"
                  />
                </FlexRow>
              </FlexRow>
            )
          })}
        </FlexCol>
      </ScrollArea>
    </Container>
  )
}
