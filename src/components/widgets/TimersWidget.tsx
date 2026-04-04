import { useEffect, useRef, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
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

  // Single interval — ticks all running timers, decrements by 1 second
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
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ color: 'var(--wt-text)' }}
    >
      {/* Add timer form */}
      <div
        className="flex gap-2 p-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--wt-border)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label"
          style={{
            flex: 1, minWidth: 0, padding: '5px 8px', fontSize: 12, borderRadius: 6,
            border: '1px solid var(--wt-border-active)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
        <input
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          placeholder="MM:SS"
          style={{
            width: 60, padding: '5px 8px', fontSize: 12, borderRadius: 6,
            border: '1px solid var(--wt-border-active)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none', textAlign: 'center',
          }}
        />
        <button
          onClick={addTimer}
          style={{
            padding: '5px 10px', fontSize: 12, borderRadius: 6,
            background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
            border: 'none', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
          }}
        >
          Add
        </button>
      </div>

      {/* Timer list */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto settings-scroll flex-1">
        {timers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
            <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
              No timers yet. Add one above.
            </p>
          </div>
        )}

        {timers.map((t) => {
          const progress  = t.durationSeconds > 0 ? t.remainingSeconds / t.durationSeconds : 0
          const done      = t.remainingSeconds <= 0
          const CIRC      = 2 * Math.PI * 15

          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: 'var(--wt-settings-divider)' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Progress arc */}
              <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3" stroke="var(--wt-border)" />
                <circle cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3"
                  stroke={done ? 'var(--wt-success)' : 'var(--wt-accent)'}
                  strokeDasharray={String(CIRC)}
                  strokeDashoffset={String(CIRC * (1 - progress))}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>

              {/* Label + countdown */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{t.label}</p>
              </div>
              <p
                className="text-base font-mono font-semibold tabular-nums flex-shrink-0"
                style={{ color: done ? 'var(--wt-success)' : t.remainingSeconds < 60 ? 'var(--wt-accent)' : 'var(--wt-text)' }}
              >
                {formatCountdown(t.remainingSeconds)}
              </p>

              {/* Controls */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleTimer(t.id)}
                  disabled={done}
                  className="wt-action-btn"
                  style={{ width: 26, height: 26 }}
                  title={t.isRunning ? 'Pause' : 'Start'}
                >
                  {t.isRunning
                    ? <span style={{ fontSize: 12 }}>⏸</span>
                    : <span style={{ fontSize: 12 }}>▶</span>
                  }
                </button>
                <button
                  onClick={() => resetTimer(t.id)}
                  className="wt-action-btn"
                  style={{ width: 26, height: 26 }}
                  title="Reset"
                >
                  <span style={{ fontSize: 12 }}>↺</span>
                </button>
                <button
                  onClick={() => deleteTimer(t.id)}
                  className="wt-action-btn wt-action-btn-danger"
                  style={{ width: 26, height: 26 }}
                  title="Delete"
                >
                  <span style={{ fontSize: 12 }}>✕</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
