import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, className }: any) => <span data-testid={`icon-${icon}`} className={className}>{icon}</span>,
  Text: ({ children, as, variant, className }: any) => {
    const Tag = as ?? 'span'
    return <Tag className={className}>{children}</Tag>
  },
}))

import { NetworkStatusBanner } from '../NetworkStatusBanner'

describe('NetworkStatusBanner', () => {
  it('renders without crashing', () => {
    render(<NetworkStatusBanner />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('shows "No internet connection" message', () => {
    render(<NetworkStatusBanner />)
    expect(screen.getByText('No internet connection')).toBeInTheDocument()
  })

  it('renders WifiSlash icon', () => {
    render(<NetworkStatusBanner />)
    expect(screen.getByTestId('icon-WifiSlash')).toBeInTheDocument()
  })

  it('is positioned as fixed', () => {
    render(<NetworkStatusBanner />)
    const banner = document.querySelector('.fixed')
    expect(banner).toBeInTheDocument()
  })

  it('has pointer-events-none to not block clicks', () => {
    render(<NetworkStatusBanner />)
    const banner = document.querySelector('.pointer-events-none')
    expect(banner).toBeInTheDocument()
  })
})
