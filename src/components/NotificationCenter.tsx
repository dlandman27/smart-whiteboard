import { useEffect, useRef, useState } from 'react'
import { useNotificationStore } from '../store/notifications'
import { IconButton, Text } from '../ui/web'

export function NotificationCenter() {
  const notifications = useNotificationStore((s) => s.notifications)
  const markAllRead   = useNotificationStore((s) => s.markAllRead)
  const clearAll      = useNotificationStore((s) => s.clearAll)
  const dismiss       = useNotificationStore((s) => s.dismissNotification)

  const [open, setOpen] = useState(false)
  const panelRef        = useRef<HTMLDivElement>(null)
  const unread          = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (open) markAllRead()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={panelRef} className="relative select-none">
      <div className="relative">
        <IconButton
          icon="Bell"
          size="xl"
          onClick={() => setOpen((o) => !o)}
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

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl overflow-hidden"
          style={{
            border:          '1px solid var(--wt-settings-border)',
            backgroundColor: 'var(--wt-settings-bg)',
            backdropFilter:  'var(--wt-backdrop)',
            boxShadow:       'var(--wt-shadow-lg)',
            zIndex:          10010,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}
          >
            <Text variant="label" size="small" color="muted" textTransform="uppercase">
              Notifications
            </Text>
            {notifications.length > 0 && (
              <IconButton icon="Trash" size="sm" onClick={clearAll} title="Clear all" />
            )}
          </div>

          <div className="max-h-80 overflow-y-auto settings-scroll">
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
        </div>
      )}
    </div>
  )
}
