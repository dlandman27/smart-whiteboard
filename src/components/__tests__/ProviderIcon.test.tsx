import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => (
    <span data-testid="icon-fallback" data-icon={icon} style={style} />
  ),
}))

vi.mock('../Logo', () => ({
  Logo: ({ size }: any) => <svg data-testid="walli-logo" width={size} height={size} />,
}))

import { ProviderIcon } from '../ProviderIcon'

describe('ProviderIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProviderIcon provider="gcal" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the Walli logo for "builtin" provider', () => {
    render(<ProviderIcon provider="builtin" />)
    expect(screen.getByTestId('walli-logo')).toBeInTheDocument()
  })

  it('renders an SVG for "gcal" provider', () => {
    const { container } = render(<ProviderIcon provider="gcal" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders an SVG for "spotify" provider', () => {
    const { container } = render(<ProviderIcon provider="spotify" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders an SVG for "notion" provider', () => {
    const { container } = render(<ProviderIcon provider="notion" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders an SVG for "youtube" provider', () => {
    const { container } = render(<ProviderIcon provider="youtube" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders an SVG for "gtasks" provider', () => {
    const { container } = render(<ProviderIcon provider="gtasks" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders an SVG for "todoist" provider', () => {
    const { container } = render(<ProviderIcon provider="todoist" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders fallback Icon for unknown provider', () => {
    render(<ProviderIcon provider="unknown-service" />)
    expect(screen.getByTestId('icon-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('icon-fallback').dataset.icon).toBe('CircleDashed')
  })

  it('uses default size of 16', () => {
    render(<ProviderIcon provider="gcal" />)
    // The BrandSvg gets size=16
    const { container } = render(<ProviderIcon provider="gcal" />)
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(16)
    expect(Number(svg.getAttribute('height'))).toBe(16)
  })

  it('uses custom size when provided', () => {
    const { container } = render(<ProviderIcon provider="gcal" size={24} />)
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(24)
    expect(Number(svg.getAttribute('height'))).toBe(24)
  })

  it('applies custom color via style', () => {
    const { container } = render(
      <ProviderIcon provider="gcal" color="red" />
    )
    const span = container.querySelector('span')!
    expect(span.style.color).toBe('red')
  })

  it('applies custom style prop', () => {
    const { container } = render(
      <ProviderIcon provider="gcal" style={{ opacity: 0.5 }} />
    )
    const span = container.querySelector('span')!
    expect(span.style.opacity).toBe('0.5')
  })

  it('wraps brand icon in a span with inline-flex display', () => {
    const { container } = render(<ProviderIcon provider="spotify" />)
    const span = container.querySelector('span')!
    expect(span.style.display).toBe('inline-flex')
  })
})
