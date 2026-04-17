import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector) =>
    selector({
      boards: [{ id: 'b1', name: 'Main', widgets: [] }],
      activeBoardId: 'b1',
      addBoard: vi.fn(),
      setActiveBoard: vi.fn(),
      addWidget: vi.fn(),
      setLayout: vi.fn(),
    })
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, weight, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

vi.mock('../Logo', () => ({
  Logo: ({ size }: any) => <div data-testid="logo" />,
}))

vi.mock('../../constants/boardTemplates', () => ({
  BOARD_TEMPLATES: [
    {
      id: 'blank',
      name: 'Blank',
      description: 'Start fresh with no widgets',
      icon: 'Square',
      layoutId: 'freeform',
      widgets: [],
    },
    {
      id: 'home-office',
      name: 'Home Office',
      description: 'Stay productive with calendar, clock, and more',
      icon: 'Briefcase',
      layoutId: 'grid-3x2',
      widgets: [
        { type: '@whiteboard/clock', variantId: 'digital', settings: {}, slotId: 'r1c1' },
      ],
    },
    {
      id: 'family-hub',
      name: 'Family Hub',
      description: 'Calendar, weather, photos for the family',
      icon: 'House',
      layoutId: 'grid-3x2',
      widgets: [],
    },
  ],
}))

import { TemplatePicker } from '../TemplatePicker'

describe('TemplatePicker', () => {
  const onComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Provide crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234-5678-90ab-cdef01234567' as any)
  })

  it('renders without crashing', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders the title', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    expect(screen.getByText('Choose a template')).toBeInTheDocument()
  })

  it('renders template cards', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    expect(screen.getByText('Blank')).toBeInTheDocument()
    expect(screen.getByText('Home Office')).toBeInTheDocument()
    expect(screen.getByText('Family Hub')).toBeInTheDocument()
  })

  it('renders template descriptions', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    expect(screen.getByText('Start fresh with no widgets')).toBeInTheDocument()
  })

  it('renders Skip and Use template buttons', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    expect(screen.getByText('Skip')).toBeInTheDocument()
    expect(screen.getByText('Use template')).toBeInTheDocument()
  })

  it('"Use template" button is disabled when no template is selected', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    const useBtn = screen.getByText('Use template')
    expect(useBtn).toBeDisabled()
  })

  it('selects a template on click', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    fireEvent.click(screen.getByText('Home Office'))
    const useBtn = screen.getByText('Use template')
    expect(useBtn).not.toBeDisabled()
  })

  it('calls onComplete when Skip is clicked', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    fireEvent.click(screen.getByText('Skip'))
    expect(onComplete).toHaveBeenCalled()
  })

  it('calls onComplete when Use template is clicked after selection', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    fireEvent.click(screen.getByText('Home Office'))
    fireEvent.click(screen.getByText('Use template'))
    expect(onComplete).toHaveBeenCalled()
  })

  it('applies template on double-click', () => {
    render(<TemplatePicker onComplete={onComplete} />)
    fireEvent.dblClick(screen.getByText('Home Office'))
    expect(onComplete).toHaveBeenCalled()
  })
})
