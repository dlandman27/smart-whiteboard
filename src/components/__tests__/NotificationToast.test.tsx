import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/notifications', () => ({
  useNotificationStore: vi.fn(),
}))

vi.mock('../../lib/sounds', () => ({
  soundAlert: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { NotificationToast } from '../NotificationToast'
import { useNotificationStore } from '../../store/notifications'
import { soundAlert } from '../../lib/sounds'

const mockUseNotif = vi.mocked(useNotificationStore)
const mockSoundAlert = vi.mocked(soundAlert)
const mockDismiss = vi.fn()

const emptyState = {
  notifications: [],
  dismissNotification: mockDismiss,
}

describe('NotificationToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(emptyState) : emptyState
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when no notifications', () => {
    const { container } = render(<NotificationToast />)
    expect(container.firstChild).toBeNull()
  })

  it('shows toast when a new notification arrives', () => {
    const state = {
      notifications: [
        { id: 'n1', title: 'New Task Alert', type: 'info' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    expect(screen.getByText('New Task Alert')).toBeInTheDocument()
  })

  it('shows notification body when present', () => {
    const state = {
      notifications: [
        { id: 'n2', title: 'Alert', body: 'Something happened', type: 'info' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Something happened')).toBeInTheDocument()
  })

  it('shows error notification', () => {
    const state = {
      notifications: [
        { id: 'n3', title: 'Error occurred', type: 'error' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('calls dismiss when X button is clicked', () => {
    const state = {
      notifications: [
        { id: 'n4', title: 'Dismissible', type: 'info' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    const closeBtn = document.querySelector('.wt-action-btn')
    if (closeBtn) fireEvent.click(closeBtn)
    expect(mockDismiss).toHaveBeenCalledWith('n4')
  })

  it('plays sound for non-error notifications', () => {
    const state = {
      notifications: [
        { id: 'n5', title: 'Sound test', type: 'info' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    expect(mockSoundAlert).toHaveBeenCalled()
  })

  it('does not play sound for error notifications', () => {
    const state = {
      notifications: [
        { id: 'n6', title: 'Error', type: 'error' as const, timestamp: Date.now(), read: false },
      ],
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<NotificationToast />)
    expect(mockSoundAlert).not.toHaveBeenCalled()
  })
})
