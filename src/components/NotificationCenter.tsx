import { useEffect, useState } from 'react'
import { useNotificationStore } from '../store/notifications'
import { IconButton, Panel, PanelHeader, Text } from '@whiteboard/ui-kit'

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

function formatCountdown(startedAt: number, durationMs: number): string {
  const live = Math.max(0, durationMs - (Date.now() - startedAt))
  if (live <= 0) return '0:00'
  const totalSecs = Math.ceil(live / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatReminderTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'now'
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `in ${days}d`
  if (hours > 0) return `in ${hours}h ${mins % 60}m`
  if (mins > 0)  return `in ${mins}m`
  return 'soon'
}

type Tab = 'active' | 'notifications'

interface Props {
  onClose: () => void
}

export function NotificationCenter({ onClose }: Props) {
  const notifications = useNotificationStore((s) => s.notifications)
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const clearAll      = useNotificationStore((s) => s.clearAll)
  const dismiss       = useNotificationStore((s) => s.dismissNotification)

  const [tab,  setTab]        = useState<Tab>('active')
  const [timers,    setTimers]    = useState<TimerEntry[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [, setTick] = useState(0)

  const unread   = notifications.filter((n) => !n.read).length
  const activeCount = timers.length + reminders.length

  // Fetch timers + reminders
  async function fetchActive() {
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
    fetchActive()
    const poll  = setInterval(fetchActive, 5_000)
    const tick  = setInterval(() => setTick((n) => n + 1), 1_000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [])

  useEffect(() => {
    markAllRead()
  }, [])

  return (
    <Panel width={400} maxHeight="calc(100vh - 120px)" onClose={onClose}>
      <PanelHeader
        title="Notifications"
        onClose={onClose}
        actions={tab === 'notifications' && notifications.length > 0
          ? <IconButton icon="Trash" size="sm" onClick={clearAll} title="Clear all" />
          : undefined
        }
      />

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-3 pt-0 pb-0"
        style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
      >
        {(['active', 'notifications'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-3 pb-2.5 pt-2.5 text-xs font-semibold capitalize transition-colors"
            style={{
              color: tab === t ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              borderBottom: tab === t ? '2px solid var(--wt-accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'active' ? 'Active' : 'Log'}
            {t === 'active' && activeCount > 0 && (
              <span className="ml-1.5 px-1 py-0.5 rounded-full text-[9px] font-bold"
                style={{ backgroundColor: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}>
                {activeCount}
              </span>
            )}
            {t === 'notifications' && unread > 0 && (
              <span className="ml-1.5 px-1 py-0.5 rounded-full text-[9px] font-bold"
                style={{ backgroundColor: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active tab — timers + reminders */}
      {tab === 'active' && (
        <div className="max-h-80 overflow-y-auto settings-scroll p-3 flex flex-col gap-2">
          {timers.length === 0 && reminders.length === 0 && (
            <Text variant="body" size="small" color="muted" align="center" className="py-6 block">
              No active timers or reminders
            </Text>
          )}

          {timers.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50 px-1"
                 style={{ color: 'var(--wt-text-muted)' }}>Timers</p>
              {timers.map((t) => {
                const live     = Math.max(0, t.durationMs - (Date.now() - t.startedAt))
                const progress = t.durationMs > 0 ? live / t.durationMs : 0
                const almostDone = live < 60_000
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: 'var(--wt-settings-divider)' }}
                  >
                    <svg width="32" height="32" viewBox="0 0 36 36" className="flex-shrink-0 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="var(--wt-border)" />
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                        stroke={almostDone ? '#f87171' : 'var(--wt-accent)'}
                        strokeDasharray={`${2 * Math.PI * 15}`}
                        strokeDashoffset={`${2 * Math.PI * 15 * (1 - progress)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <p className="text-xs flex-1 min-w-0 truncate">{t.label}</p>
                    <p className="text-sm font-mono font-bold tabular-nums flex-shrink-0"
                       style={{ color: almostDone ? '#f87171' : 'var(--wt-text)' }}>
                      {formatCountdown(t.startedAt, t.durationMs)}
                    </p>
                  </div>
                )
              })}
            </>
          )}

          {reminders.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50 px-1 mt-1"
                 style={{ color: 'var(--wt-text-muted)' }}>Reminders</p>
              {reminders
                .slice()
                .sort((a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime())
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: 'var(--wt-settings-divider)' }}
                  >
                    <span className="text-sm flex-shrink-0">🔔</span>
                    <p className="text-xs flex-1 min-w-0 truncate">{r.text}</p>
                    <p className="text-[11px] flex-shrink-0 tabular-nums opacity-60">
                      {formatReminderTime(r.fireAt)}
                    </p>
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      {/* Notifications tab — log */}
      {tab === 'notifications' && (
        <div className="max-h-72 overflow-y-auto settings-scroll">
          {notifications.length === 0 ? (
            <Text variant="body" size="small" color="muted" align="center" className="py-8 block">
              No notifications
            </Text>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
              >
                <div className="flex-1 min-w-0">
                  <Text variant="body" size="small">{n.title}</Text>
                  {n.body && (
                    <Text variant="body" size="small" color="muted" className="mt-0.5">
                      {n.body}
                    </Text>
                  )}
                  <Text variant="caption" size="small" color="muted" className="mt-1 block" style={{ opacity: 0.55 }}>
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </div>
                <IconButton icon="X" size="sm" onClick={() => dismiss(n.id)} />
              </div>
            ))
          )}
        </div>
      )}
    </Panel>
  )
}

interface ButtonProps {
  active:  boolean
  onClick: () => void
}

export function NotificationCenterButton({ active, onClick }: ButtonProps) {
  const notifications = useNotificationStore((s) => s.notifications)
  const unread        = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <IconButton
        icon="Bell"
        size="xl"
        variant={active ? 'active' : 'default'}
        onClick={onClick}
        title="Notifications"
      />
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold leading-none pointer-events-none"
          style={{ backgroundColor: 'var(--wt-accent)', color: 'var(--wt-accent-text)' }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  )
}
