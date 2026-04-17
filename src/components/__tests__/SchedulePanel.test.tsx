import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('../../constants/schedulePresets', () => ({
  findActiveSlot: vi.fn(() => null),
  DEFAULT_SCHEDULE: { enabled: false, slots: [] },
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { SchedulePanel } from '../SchedulePanel'
import { useWhiteboardStore } from '../../store/whiteboard'
import { findActiveSlot } from '../../constants/schedulePresets'

const mockUseWB = vi.mocked(useWhiteboardStore)
const mockFindActiveSlot = vi.mocked(findActiveSlot)
const mockSetSchedule = vi.fn()

function setState(state: any) {
  mockUseWB.mockImplementation((selector?: any) =>
    selector ? selector(state) : state
  )
}

const defaultState = {
  boards: [
    { id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' },
    { id: 'b2', name: 'Work Board', widgets: [], layoutId: 'freeform' },
  ],
  schedule: { enabled: false, slots: [] },
  setSchedule: mockSetSchedule,
}

describe('SchedulePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindActiveSlot.mockReturnValue(null)
    setState(defaultState)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('slot-uuid-1234-5678-90ab-cdef01234567' as any)
  })

  it('renders without crashing', () => {
    render(<SchedulePanel />)
    expect(document.body.firstChild).toBeTruthy()
  })

  it('renders screen scheduling toggle', () => {
    render(<SchedulePanel />)
    expect(screen.getByText('Screen Scheduling')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<SchedulePanel />)
    expect(screen.getByText('Auto-switch boards based on time of day')).toBeInTheDocument()
  })

  it('does not show slot list when scheduling is disabled', () => {
    render(<SchedulePanel />)
    expect(screen.queryByText('Add time slot')).not.toBeInTheDocument()
  })

  it('calls setSchedule when toggle is clicked', () => {
    render(<SchedulePanel />)
    // The toggle button is the one that changes schedule.enabled
    const buttons = screen.getAllByRole('button')
    // First button is the toggle (based on the rendering order)
    fireEvent.click(buttons[0])
    expect(mockSetSchedule).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
  })

  it('shows "Add time slot" button when scheduling is enabled', () => {
    setState({
      ...defaultState,
      schedule: { enabled: true, slots: [] },
    })
    render(<SchedulePanel />)
    expect(screen.getByText('Add time slot')).toBeInTheDocument()
  })

  it('adds a slot when "Add time slot" is clicked', () => {
    setState({
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: { enabled: true, slots: [] },
      setSchedule: mockSetSchedule,
    })
    render(<SchedulePanel />)
    fireEvent.click(screen.getByText('Add time slot'))
    expect(mockSetSchedule).toHaveBeenCalledWith(expect.objectContaining({
      slots: expect.arrayContaining([
        expect.objectContaining({ boardId: 'b1', startTime: '09:00', endTime: '17:00' }),
      ]),
    }))
  })

  it('shows slots when schedule has slots', () => {
    setState({
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: {
        enabled: true,
        slots: [{ id: 's1', boardId: 'b1', startTime: '09:00', endTime: '17:00', days: [] }],
      },
      setSchedule: mockSetSchedule,
    })
    render(<SchedulePanel />)
    const timeInputs = screen.getAllByDisplayValue('09:00')
    expect(timeInputs.length).toBeGreaterThan(0)
  })

  it('shows day buttons for each slot', () => {
    setState({
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: {
        enabled: true,
        slots: [{ id: 's1', boardId: 'b1', startTime: '09:00', endTime: '17:00', days: [] }],
      },
      setSchedule: mockSetSchedule,
    })
    render(<SchedulePanel />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Every day')).toBeInTheDocument()
  })

  it('shows "no boards" message when no user boards exist', () => {
    setState({
      boards: [{ id: 'sys1', name: 'Settings', widgets: [], boardType: 'settings' }],
      schedule: { enabled: true, slots: [] },
      setSchedule: mockSetSchedule,
    })
    render(<SchedulePanel />)
    expect(screen.getByText(/Create at least one board/)).toBeInTheDocument()
  })

  it('shows active slot indicator when scheduling enabled and slot is active', () => {
    mockFindActiveSlot.mockReturnValue({ id: 's1', boardId: 'b1' } as any)
    setState({
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: {
        enabled: true,
        slots: [{ id: 's1', boardId: 'b1', startTime: '09:00', endTime: '17:00', days: [] }],
      },
      setSchedule: mockSetSchedule,
    })
    render(<SchedulePanel />)
    expect(screen.getByText(/Currently scheduled: Main Board/)).toBeInTheDocument()
  })
})
