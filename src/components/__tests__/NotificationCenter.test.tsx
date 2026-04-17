import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/notifications', () => ({
  useNotificationStore: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  IconButton: ({ icon, onClick, title, size }: any) => (
    <button data-testid={`icon-btn-${icon}`} onClick={onClick} title={title}>{icon}</button>
  ),
  Panel: ({ children, width, maxHeight, onClose }: any) => <div data-testid="panel">{children}</div>,
  PanelHeader: ({ title, onClose, actions }: any) => (
    <div>
      <span>{title}</span>
      {actions}
      <button onClick={onClose}>Close</button>
    </div>
  ),
  Text: ({ children, variant, size, color, align, className }: any) => (
    <span className={className}>{children}</span>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { NotificationCenter } from '../NotificationCenter'
import { useNotificationStore } from '../../store/notifications'

const mockUseNotif = vi.mocked(useNotificationStore)
const mockMarkAllRead = vi.fn()
const mockClearAll = vi.fn()
const mockDismiss = vi.fn()

const emptyState = {
  notifications: [],
  markAllRead: mockMarkAllRead,
  clearAll: mockClearAll,
  dismissNotification: mockDismiss,
}

describe('NotificationCenter', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(emptyState) : emptyState
    )
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
  })

  it('renders without crashing', () => {
    render(<NotificationCenter onClose={onClose} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('renders "Notifications" title', () => {
    render(<NotificationCenter onClose={onClose} />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders tabs', () => {
    render(<NotificationCenter onClose={onClose} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Log')).toBeInTheDocument()
  })

  it('shows "No active timers or reminders" by default', async () => {
    render(<NotificationCenter onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByText('No active timers or reminders')).toBeInTheDocument()
    })
  })

  it('calls markAllRead on mount', async () => {
    render(<NotificationCenter onClose={onClose} />)
    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalled()
    })
  })

  it('switches to notifications tab', () => {
    render(<NotificationCenter onClose={onClose} />)
    fireEvent.click(screen.getByText('Log'))
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('renders notifications when present', () => {
    const stateWithNotif = {
      notifications: [
        {
          id: 'n1',
          title: 'Task overdue',
          body: 'You have 2 overdue tasks',
          type: 'info' as const,
          timestamp: Date.now(),
          read: false,
        },
      ],
      markAllRead: mockMarkAllRead,
      clearAll: mockClearAll,
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(stateWithNotif) : stateWithNotif
    )

    render(<NotificationCenter onClose={onClose} />)
    fireEvent.click(screen.getByText('Log'))
    expect(screen.getByText('Task overdue')).toBeInTheDocument()
    expect(screen.getByText('You have 2 overdue tasks')).toBeInTheDocument()
  })

  it('calls dismiss when X is clicked on a notification', () => {
    const stateWithNotif = {
      notifications: [
        { id: 'n1', title: 'Test', type: 'info' as const, timestamp: Date.now(), read: false },
      ],
      markAllRead: mockMarkAllRead,
      clearAll: mockClearAll,
      dismissNotification: mockDismiss,
    }
    mockUseNotif.mockImplementation((selector?: any) =>
      selector ? selector(stateWithNotif) : stateWithNotif
    )

    render(<NotificationCenter onClose={onClose} />)
    fireEvent.click(screen.getByText('Log'))
    fireEvent.click(screen.getByTestId('icon-btn-X'))
    expect(mockDismiss).toHaveBeenCalledWith('n1')
  })

  it('calls onClose when close button is clicked', () => {
    render(<NotificationCenter onClose={onClose} />)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
