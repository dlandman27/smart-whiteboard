import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotificationStore } from './notifications'
import type { Notification } from './notifications'

const store = () => useNotificationStore.getState()

beforeEach(() => {
  useNotificationStore.setState(useNotificationStore.getInitialState(), true)
})

describe('useNotificationStore — initial state', () => {
  it('starts with an empty notifications array', () => {
    expect(store().notifications).toEqual([])
  })
})

describe('addNotification', () => {
  it('adds a notification with auto-generated id, timestamp, and read=false', () => {
    store().addNotification({ title: 'Test', body: 'Hello' })
    const notifs = store().notifications
    expect(notifs).toHaveLength(1)
    expect(notifs[0].title).toBe('Test')
    expect(notifs[0].body).toBe('Hello')
    expect(notifs[0].read).toBe(false)
    expect(typeof notifs[0].id).toBe('string')
    expect(notifs[0].id.length).toBeGreaterThan(0)
    expect(typeof notifs[0].timestamp).toBe('number')
  })

  it('defaults type to "info" when not provided', () => {
    store().addNotification({ title: 'Info notif' })
    expect(store().notifications[0].type).toBe('info')
  })

  it('respects an explicit "error" type', () => {
    store().addNotification({ title: 'Oops', type: 'error' })
    expect(store().notifications[0].type).toBe('error')
  })

  it('stores optional widgetId', () => {
    store().addNotification({ title: 'Widget notif', widgetId: 'w-42' })
    expect(store().notifications[0].widgetId).toBe('w-42')
  })

  it('prepends new notifications so newest is first', () => {
    store().addNotification({ title: 'First' })
    store().addNotification({ title: 'Second' })
    expect(store().notifications[0].title).toBe('Second')
    expect(store().notifications[1].title).toBe('First')
  })

  it('generates unique ids for each notification', () => {
    store().addNotification({ title: 'A' })
    store().addNotification({ title: 'B' })
    const [n1, n2] = store().notifications
    expect(n1.id).not.toBe(n2.id)
  })
})

describe('dismissNotification', () => {
  it('removes the notification with the given id', () => {
    store().addNotification({ title: 'One' })
    store().addNotification({ title: 'Two' })
    const id = store().notifications[0].id
    store().dismissNotification(id)
    expect(store().notifications).toHaveLength(1)
    expect(store().notifications[0].id).not.toBe(id)
  })

  it('is a no-op when the id does not exist', () => {
    store().addNotification({ title: 'Exists' })
    store().dismissNotification('nonexistent-id')
    expect(store().notifications).toHaveLength(1)
  })

  it('leaves an empty array when the last notification is dismissed', () => {
    store().addNotification({ title: 'Only one' })
    const id = store().notifications[0].id
    store().dismissNotification(id)
    expect(store().notifications).toEqual([])
  })
})

describe('dismissAllByWidget', () => {
  it('removes all notifications for the given widgetId', () => {
    store().addNotification({ title: 'Widget A', widgetId: 'w-1' })
    store().addNotification({ title: 'Widget B', widgetId: 'w-2' })
    store().addNotification({ title: 'Widget A 2', widgetId: 'w-1' })
    store().dismissAllByWidget('w-1')
    const remaining = store().notifications
    expect(remaining).toHaveLength(1)
    expect(remaining[0].widgetId).toBe('w-2')
  })

  it('is a no-op when no notifications match the widgetId', () => {
    store().addNotification({ title: 'Other', widgetId: 'w-99' })
    store().dismissAllByWidget('w-not-here')
    expect(store().notifications).toHaveLength(1)
  })

  it('does not remove notifications without a widgetId', () => {
    store().addNotification({ title: 'No widget' })
    store().dismissAllByWidget('w-1')
    expect(store().notifications).toHaveLength(1)
  })
})

describe('markAllRead', () => {
  it('marks all notifications as read', () => {
    store().addNotification({ title: 'A' })
    store().addNotification({ title: 'B' })
    store().markAllRead()
    store().notifications.forEach((n) => expect(n.read).toBe(true))
  })

  it('is safe on an empty list', () => {
    store().markAllRead()
    expect(store().notifications).toEqual([])
  })

  it('preserves all other fields when marking read', () => {
    store().addNotification({ title: 'Keep me', body: 'body text', type: 'error' })
    store().markAllRead()
    const n = store().notifications[0]
    expect(n.title).toBe('Keep me')
    expect(n.body).toBe('body text')
    expect(n.type).toBe('error')
  })
})

describe('clearAll', () => {
  it('removes all notifications', () => {
    store().addNotification({ title: 'A' })
    store().addNotification({ title: 'B' })
    store().clearAll()
    expect(store().notifications).toEqual([])
  })

  it('is a no-op on an already empty list', () => {
    store().clearAll()
    expect(store().notifications).toEqual([])
  })
})
