import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { LayoutSlot } from '../layout/LayoutSlot'

const defaultProps = {
  id: 'slot-1',
  x: 10,
  y: 20,
  width: 400,
  height: 300,
  mode: 'place' as const,
  isHovered: false,
}

describe('LayoutSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when mode is hidden', () => {
    const { container } = render(
      <LayoutSlot {...defaultProps} mode="hidden" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a slot in place mode', () => {
    const { container } = render(<LayoutSlot {...defaultProps} mode="place" />)
    expect(container.querySelector('.absolute')).toBeInTheDocument()
  })

  it('renders a slot in swap mode', () => {
    const { container } = render(<LayoutSlot {...defaultProps} mode="swap" />)
    expect(container.querySelector('.absolute')).toBeInTheDocument()
  })

  it('positions slot at given x, y, width, height', () => {
    const { container } = render(<LayoutSlot {...defaultProps} />)
    const el = container.querySelector('.absolute') as HTMLElement
    expect(el.style.left).toBe('10px')
    expect(el.style.top).toBe('20px')
    expect(el.style.width).toBe('400px')
    expect(el.style.height).toBe('300px')
  })

  it('shows Swap label when mode is swap and isHovered is true', () => {
    render(<LayoutSlot {...defaultProps} mode="swap" isHovered={true} />)
    expect(screen.getByText('Swap')).toBeInTheDocument()
  })

  it('does not show Swap label when mode is swap but not hovered', () => {
    render(<LayoutSlot {...defaultProps} mode="swap" isHovered={false} />)
    expect(screen.queryByText('Swap')).not.toBeInTheDocument()
  })

  it('does not show Swap label in place mode even when hovered', () => {
    render(<LayoutSlot {...defaultProps} mode="place" isHovered={true} />)
    expect(screen.queryByText('Swap')).not.toBeInTheDocument()
  })

  it('calls onClick when the slot is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<LayoutSlot {...defaultProps} onClick={onClick} />)
    const el = container.querySelector('.absolute') as HTMLElement
    fireEvent.click(el)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies animate-pulse class when not hovered', () => {
    const { container } = render(<LayoutSlot {...defaultProps} isHovered={false} />)
    const inner = container.querySelector('.animate-pulse')
    expect(inner).toBeInTheDocument()
  })

  it('does not apply animate-pulse class when hovered', () => {
    const { container } = render(<LayoutSlot {...defaultProps} isHovered={true} />)
    const inner = container.querySelector('.animate-pulse')
    expect(inner).not.toBeInTheDocument()
  })
})
