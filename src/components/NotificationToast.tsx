import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/web'
import { useNotificationStore, type Notification } from '../store/notifications'
import { soundAlert } from '../lib/sounds'

const TOAST_DURATION = 4500

export function NotificationToast() {
  const notifications = useNotificationStore((s) => s.notifications)
  const dismiss       = useNotificationStore((s) => s.dismissNotification)

  const [visibleIds, setVisibleIds] = useState<string[]>([])
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    notifications.forEach((n) => {
      if (seenIds.current.has(n.id)) return
      seenIds.current.add(n.id)
      if (n.type !== 'error') soundAlert()
      setVisibleIds((prev) => [...prev, n.id])
      setTimeout(() => {
        setVisibleIds((prev) => prev.filter((id) => id !== n.id))
      }, TOAST_DURATION)
    })
  }, [notifications])

  // If a notification is dismissed from the center, remove from toast too
  useEffect(() => {
    const existingIds = new Set(notifications.map((n) => n.id))
    setVisibleIds((prev) => prev.filter((id) => existingIds.has(id)))
  }, [notifications])

  const toasts = visibleIds
    .map((id) => notifications.find((n) => n.id === id))
    .filter(Boolean) as Notification[]

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col-reverse gap-2 pointer-events-none select-none">
      {toasts.map((n) => {
        const isError = n.type === 'error'
        return (
          <div
            key={n.id}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl max-w-xs"
            style={{
              backgroundColor: 'var(--wt-bg)',
              border:          isError ? '1px solid var(--wt-danger)' : '1px solid var(--wt-border-active)',
              borderLeft:      isError ? '3px solid var(--wt-danger)' : undefined,
              backdropFilter:  'var(--wt-backdrop)',
              boxShadow:       'var(--wt-shadow-lg)',
            }}
          >
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: isError ? 'var(--wt-danger)' : 'var(--wt-text)' }}
              >
                {n.title}
              </p>
              {n.body && (
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--wt-text-muted)' }}>
                  {n.body}
                </p>
              )}
            </div>
            <button
              className="wt-action-btn flex-shrink-0 mt-0.5"
              style={{ width: 18, height: 18 }}
              onClick={() => {
                setVisibleIds((prev) => prev.filter((id) => id !== n.id))
                dismiss(n.id)
              }}
            >
              <Icon icon="X" size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
