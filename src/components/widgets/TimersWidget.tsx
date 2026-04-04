import { useEffect, useRef, useState } from 'react'

interface TimerEntry {
  id:         string
  label:      string
  durationMs: number
  startedAt:  number
  remainingMs: number
}

interface Reminder {
  id:     string
  text:   string
  fireAt: string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSecs = Math.ceil(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatReminderTime(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff < 0) return 'now'
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)   return `in ${days}d`
  if (hours > 0)  return `in ${hours}h`
  if (mins > 0)   return `in ${mins}m`
  return 'soon'
}

export function TimersWidget() {
  const [timers,    setTimers]    = useState<TimerEntry[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  // tick every second to update countdown display
  const [tick, setTick] = useState(0)
  const tickRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchAll() {
    try {
      const [t, r] = await Promise.all([
        fetch('/api/timers').then((r) => r.json()),
        fetch('/api/reminders').then((r) => r.json()),
      ])
      setTimers(t)
      setReminders(r)
    } catch { /* server may be starting */ }
  }

  useEffect(() => {
    fetchAll()
    const poll = setInterval(fetchAll, 5_000)
    tickRef.current = setInterval(() => setTick((n) => n + 1), 1_000)
    return () => {
      clearInterval(poll)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [])

  const now         = Date.now()
  const hasTimers   = timers.length > 0
  const hasReminders = reminders.length > 0
  const isEmpty     = !hasTimers && !hasReminders

  return (
    <div
      className="w-full h-full flex flex-col gap-2 p-4 overflow-y-auto settings-scroll"
      style={{ color: 'var(--wt-text)' }}
    >
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
          <span className="text-3xl">⏰</span>
          <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
            No active timers or reminders
          </p>
        </div>
      )}

      {hasTimers && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 opacity-50"
             style={{ color: 'var(--wt-text-muted)' }}>
            Timers
          </p>
          <div className="flex flex-col gap-2">
            {timers.map((t) => {
              const remaining = Math.max(0, t.remainingMs - (Date.now() - now + tick * 0))
              // recalc from startedAt
              const live      = Math.max(0, t.durationMs - (Date.now() - t.startedAt))
              const progress  = t.durationMs > 0 ? (live / t.durationMs) : 0
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'var(--wt-settings-divider)' }}
                >
                  {/* Progress arc */}
                  <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none"
                      strokeWidth="3" stroke="var(--wt-border)" />
                    <circle cx="18" cy="18" r="15" fill="none"
                      strokeWidth="3"
                      stroke="var(--wt-accent)"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - progress)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.label}</p>
                  </div>
                  <p className="text-base font-mono font-semibold tabular-nums flex-shrink-0"
                     style={{ color: live < 60_000 ? 'var(--wt-accent)' : 'var(--wt-text)' }}>
                    {formatCountdown(live)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {hasReminders && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 opacity-50"
             style={{ color: 'var(--wt-text-muted)' }}>
            Reminders
          </p>
          <div className="flex flex-col gap-1.5">
            {reminders
              .slice()
              .sort((a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime())
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'var(--wt-settings-divider)' }}
                >
                  <span className="text-base flex-shrink-0">🔔</span>
                  <p className="text-xs flex-1 min-w-0 truncate">{r.text}</p>
                  <p className="text-[11px] flex-shrink-0 opacity-60 tabular-nums">
                    {formatReminderTime(r.fireAt)}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
