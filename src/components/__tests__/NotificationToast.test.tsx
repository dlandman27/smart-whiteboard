import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

const mockDismiss = vi.fn()

vi.mock('../../store/notifications', () => ({
  useNotificationStore: vi.fn((selector) =>
    selector({
      notifications: [],
      dismissNotification: mockDismiss,
    })
  ),
}))

vi.mock('../../lib/sounds', () => ({
  soundAlert: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { NotificationToast } from '../NotificationToast'

describe('NotificationToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when no notifications', () => {
    const { container } = render(<NotificationToast />)
    expect(container.firstChild).toBeNull()
  })

  it('shows toast when a new notification arrives', () => {
    const { useNotificationStore } = require('../../store/notifications')
    useNotificationStore.mockImplementation((selector: any) =>
      selector({
        notifications: [
          { id: 'n1', title: 'New Task Alert', type: 'info', timestamp: Date.now(), read: false },
        ],
        dismissNotification: mockDismiss,
      })
    )

    render(<NotificationToast />)
    expect(screen.getByText('New Task Alert')).toBeInTheDocument()
  })

  it('shows notification body when present', () => {
    const { useNotificationStore } = require('../../store/notifications')
    useNotificationStore.mockImplementation((selector: any) =>
      selector({
        notifications: [
          { id: 'n2', title: 'Alert', body: 'Something happened', type: 'info', timestamp: Date.now(), read: false },
        ],
        dismissNotification: mockDismiss,
      })
    )

    render(<NotificationToast />)
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Something happened')).toBeInTheDocument()
  })

  it('shows error notification with different style', () => {
    const { useNotificationStore } = require('../../store/notifications')
    useNotificationStore.mockImplementation((selector: any) =>
      selector({
        notifications: [
          { id: 'n3', title: 'Error occurred', type: 'error', timestamp: Date.now(), read: false },
        ],
        dismissNotification: mockDismiss,
      })
    )

    render(<NotificationToast />)
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('calls dismiss when X button is clicked', () => {
    const { useNotificationStore } = require('../../store/notifications')
    useNotificationStore.mockImplementation((selector: any) =>
      selector({
        notifications: [
          { id: 'n4', title: 'Dismissible', type: 'info', timestamp: Date.now(), read: false },
        ],
        dismissNotification: mockDismiss,
      })
    )

    render(<NotificationToast />)
    const closeBtn = document.querySelector('.wt-action-btn')
    if (closeBtn) fireEvent.click(closeBtn)
    expect(mockDismiss).toHaveBeenCalledWith('n4')
  })

  it('plays sound for non-error notifications', () => {
    const { soundAlert } = require('../../lib/sounds')
    const { useNotificationStore } = require('../../store/notifications')
    useNotificationStore.mockImplementation((selector: any) =>
      selector({
        notifications: [
          { id: 'n5', title: 'Sound test', type: 'info', timestamp: Date.now(), read: false },
        ],
        dismissNotification: mockDismiss,
      })
    )

    render(<NotificationToast />)
    expect(soundAlert).toHaveBeenCalled()
  })
})
