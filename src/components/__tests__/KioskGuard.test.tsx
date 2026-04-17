import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

const mockRefetchQueries = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    refetchQueries: mockRefetchQueries,
  })),
}))

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(() => true),
}))

vi.mock('../../hooks/useKioskRefresh', () => ({
  useKioskRefresh: vi.fn(),
}))

vi.mock('../NetworkStatusBanner', () => ({
  NetworkStatusBanner: () => (
    <div data-testid="network-status-banner">No internet connection</div>
  ),
}))

import { KioskGuard } from '../KioskGuard'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

describe('KioskGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when online', () => {
    vi.mocked(useNetworkStatus).mockReturnValue(true)
    render(
      <KioskGuard>
        <div data-testid="child-content">App is here</div>
      </KioskGuard>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('App is here')).toBeInTheDocument()
  })

  it('does not show NetworkStatusBanner when online', () => {
    vi.mocked(useNetworkStatus).mockReturnValue(true)
    render(
      <KioskGuard>
        <div>content</div>
      </KioskGuard>
    )
    expect(screen.queryByTestId('network-status-banner')).not.toBeInTheDocument()
  })

  it('shows NetworkStatusBanner when offline', () => {
    vi.mocked(useNetworkStatus).mockReturnValue(false)
    render(
      <KioskGuard>
        <div>content</div>
      </KioskGuard>
    )
    expect(screen.getByTestId('network-status-banner')).toBeInTheDocument()
  })

  it('still renders children when offline', () => {
    vi.mocked(useNetworkStatus).mockReturnValue(false)
    render(
      <KioskGuard>
        <div data-testid="child-offline">Offline child</div>
      </KioskGuard>
    )
    expect(screen.getByTestId('child-offline')).toBeInTheDocument()
  })

  it('calls refetchQueries when network comes back online', async () => {
    // Start offline
    vi.mocked(useNetworkStatus).mockReturnValue(false)
    const { rerender } = render(
      <KioskGuard>
        <div>content</div>
      </KioskGuard>
    )
    // Come online
    vi.mocked(useNetworkStatus).mockReturnValue(true)
    await act(async () => {
      rerender(
        <KioskGuard>
          <div>content</div>
        </KioskGuard>
      )
    })
    expect(mockRefetchQueries).toHaveBeenCalled()
  })

  it('renders multiple children', () => {
    vi.mocked(useNetworkStatus).mockReturnValue(true)
    render(
      <KioskGuard>
        <div>First</div>
        <div>Second</div>
      </KioskGuard>
    )
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })
})
