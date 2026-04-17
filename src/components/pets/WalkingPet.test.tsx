import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mocks must be at the top before any imports
vi.mock('./PixelSprite', () => ({
  PixelSprite: ({ sprite, frameIdx, flip }: any) => (
    <div data-testid="pixel-sprite" data-frame={frameIdx} data-flip={String(flip)} />
  ),
}))

import { WalkingPet } from './WalkingPet'

const baseAgent = {
  id:          'task-monitor',
  name:        'Task Monitor',
  icon:        '📋',
  description: 'Monitors your tasks',
}

const defaultProps = {
  agent:         baseAgent,
  mood:          'idle',
  message:       null,
  onMessageDone: vi.fn(),
  onInspect:     vi.fn(),
  inspecting:    false,
}

describe('WalkingPet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<WalkingPet {...defaultProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the PixelSprite child', () => {
    render(<WalkingPet {...defaultProps} />)
    expect(screen.getByTestId('pixel-sprite')).toBeInTheDocument()
  })

  it('does not show bubble when no message and not inspecting', () => {
    render(<WalkingPet {...defaultProps} />)
    // bubble contains agent name — should not be visible
    expect(screen.queryByText('Task Monitor')).not.toBeInTheDocument()
  })

  it('shows message bubble when message is provided', () => {
    render(
      <WalkingPet
        {...defaultProps}
        message="Hello there!"
        mood="speaking"
      />
    )
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
  })

  it('shows agent name in bubble when message is provided', () => {
    render(
      <WalkingPet
        {...defaultProps}
        message="Hello!"
        mood="speaking"
      />
    )
    // Agent name appears inside a <strong> tag with the icon — use regex
    expect(screen.getByText(/Task Monitor/)).toBeInTheDocument()
  })

  it('shows description in bubble when inspecting with no message', () => {
    render(
      <WalkingPet
        {...defaultProps}
        inspecting={true}
        message={null}
      />
    )
    expect(screen.getByText('Monitors your tasks')).toBeInTheDocument()
  })

  it('shows message over description when both inspecting and message present', () => {
    render(
      <WalkingPet
        {...defaultProps}
        inspecting={true}
        message="Active message"
        mood="speaking"
      />
    )
    expect(screen.getByText('Active message')).toBeInTheDocument()
    expect(screen.queryByText('Monitors your tasks')).not.toBeInTheDocument()
  })

  it('shows agent icon and name in bubble header when message present', () => {
    render(
      <WalkingPet
        {...defaultProps}
        message="Hi!"
        mood="speaking"
      />
    )
    // The bubble header contains icon + name
    const header = screen.getByText(/Task Monitor/)
    expect(header).toBeInTheDocument()
  })

  it('accepts a custom spriteType', () => {
    const agentWithSprite = { ...baseAgent, spriteType: 'dragon' }
    const { container } = render(
      <WalkingPet {...defaultProps} agent={agentWithSprite} />
    )
    expect(container.firstChild).toBeTruthy()
    expect(screen.getByTestId('pixel-sprite')).toBeInTheDocument()
  })

  it('renders for calendar-agent (uses cat sprite)', () => {
    const calAgent = { id: 'calendar-agent', name: 'Calendar', icon: '📅', description: 'Cal' }
    const { container } = render(
      <WalkingPet {...defaultProps} agent={calAgent} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('has a clickable element that triggers onInspect', () => {
    const onInspect = vi.fn()
    render(<WalkingPet {...defaultProps} onInspect={onInspect} />)
    // The outer div has onClick={onInspect}
    const clickable = screen.getByTitle('Task Monitor')
    clickable.click()
    expect(onInspect).toHaveBeenCalledTimes(1)
  })
})
