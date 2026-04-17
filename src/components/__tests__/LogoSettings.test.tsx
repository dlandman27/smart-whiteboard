import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../SettingsPanel', () => ({
  SettingsPanel: ({ onClose }: any) => (
    <div data-testid="settings-panel">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

import { LogoSettings } from '../LogoSettings'

describe('LogoSettings', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LogoSettings showSettings={false} onCloseSettings={vi.fn()} />
    )
    expect(container).toBeTruthy()
  })

  it('renders nothing when showSettings is false', () => {
    const { container } = render(
      <LogoSettings showSettings={false} onCloseSettings={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders SettingsPanel when showSettings is true', () => {
    render(<LogoSettings showSettings={true} onCloseSettings={vi.fn()} />)
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument()
  })

  it('passes onCloseSettings to SettingsPanel as onClose', () => {
    const onClose = vi.fn()
    render(<LogoSettings showSettings={true} onCloseSettings={onClose} />)
    screen.getByText('Close').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides panel when showSettings transitions to false', () => {
    const { rerender } = render(
      <LogoSettings showSettings={true} onCloseSettings={vi.fn()} />
    )
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument()

    rerender(<LogoSettings showSettings={false} onCloseSettings={vi.fn()} />)
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument()
  })
})
