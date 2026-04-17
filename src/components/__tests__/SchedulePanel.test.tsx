import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockSetSchedule = vi.fn()

const mockScheduleState = {
  boards: [
    { id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' },
    { id: 'b2', name: 'Work Board', widgets: [], layoutId: 'freeform' },
  ],
  schedule: {
    enabled: false,
    slots: [],
  },
  setSchedule: mockSetSchedule,
}

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) =>
    selector ? selector(mockScheduleState) : mockScheduleState
  ),
}))

vi.mock('../../constants/schedulePresets', () => ({
  findActiveSlot: vi.fn(() => null),
  DEFAULT_SCHEDULE: { enabled: false, slots: [] },
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { SchedulePanel } from '../SchedulePanel'

describe('SchedulePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    // When disabled, the "Add time slot" button should not be visible
    expect(screen.queryByText('Add time slot')).not.toBeInTheDocument()
  })

  it('calls setSchedule when toggle is clicked', () => {
    render(<SchedulePanel />)
    const toggleBtn = document.querySelector('button[style*="backgroundColor"]')
    if (toggleBtn) fireEvent.click(toggleBtn)
    expect(mockSetSchedule).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
  })

  it('shows "Add time slot" button when scheduling is enabled', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: { enabled: true, slots: [] },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<SchedulePanel />)
    expect(screen.getByText('Add time slot')).toBeInTheDocument()
  })

  it('adds a slot when "Add time slot" is clicked', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: { enabled: true, slots: [] },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<SchedulePanel />)
    fireEvent.click(screen.getByText('Add time slot'))
    expect(mockSetSchedule).toHaveBeenCalledWith(expect.objectContaining({
      slots: expect.arrayContaining([
        expect.objectContaining({ boardId: 'b1', startTime: '09:00', endTime: '17:00' }),
      ]),
    }))
  })

  it('shows slots when schedule has slots', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: {
        enabled: true,
        slots: [{
          id: 's1',
          boardId: 'b1',
          startTime: '09:00',
          endTime: '17:00',
          days: [],
        }],
      },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<SchedulePanel />)
    // Time inputs should be visible for each slot
    const timeInputs = screen.getAllByDisplayValue('09:00')
    expect(timeInputs.length).toBeGreaterThan(0)
  })

  it('shows day buttons for each slot', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: {
        enabled: true,
        slots: [{
          id: 's1',
          boardId: 'b1',
          startTime: '09:00',
          endTime: '17:00',
          days: [],
        }],
      },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<SchedulePanel />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Every day')).toBeInTheDocument()
  })

  it('shows "no boards" message when no user boards exist', () => {
    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'sys1', name: 'Settings', widgets: [], boardType: 'settings' }],
      schedule: { enabled: true, slots: [] },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )

    render(<SchedulePanel />)
    expect(screen.getByText(/Create at least one board/)).toBeInTheDocument()
  })

  it('shows active slot indicator when scheduling enabled and slot is active', () => {
    const { findActiveSlot } = require('../../constants/schedulePresets')
    findActiveSlot.mockReturnValue({ id: 's1', boardId: 'b1' })

    const { useWhiteboardStore } = require('../../store/whiteboard')
    const state = {
      boards: [{ id: 'b1', name: 'Main Board', widgets: [], layoutId: 'freeform' }],
      schedule: { enabled: true, slots: [{ id: 's1', boardId: 'b1', startTime: '09:00', endTime: '17:00', days: [] }] },
      setSchedule: mockSetSchedule,
    }
    useWhiteboardStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state
    )
    )

    render(<SchedulePanel />)
    expect(screen.getByText(/Currently scheduled: Main Board/)).toBeInTheDocument()
  })
})
