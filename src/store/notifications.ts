import { create } from 'zustand'

export interface Notification {
  id:        string
  title:     string
  body?:     string
  type?:     'info' | 'error'   // defaults to 'info'
  widgetId?: string   // source widget — used for cleanup when widget is removed
  timestamp: number
  read:      boolean
}

interface NotificationStore {
  notifications: Notification[]
  addNotification:    (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  dismissNotification:(id: string) => void
  dismissAllByWidget: (widgetId: string) => void
  markAllRead:        () => void
  clearAll:           () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: [],

  addNotification: (notif) =>
    set((s) => ({
      notifications: [
        { type: 'info' as const, ...notif, id: crypto.randomUUID(), timestamp: Date.now(), read: false },
        ...s.notifications,
      ],
    })),

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  dismissAllByWidget: (widgetId) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.widgetId !== widgetId) })),

  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  clearAll: () => set({ notifications: [] }),
}))
