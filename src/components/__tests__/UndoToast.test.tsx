import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/undo', () => ({
  useUndoStore: vi.fn(),
}))

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn(),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { UndoToast } from '../UndoToast'
import { useUndoStore } from '../../store/undo'
import { useWhiteboardStore } from '../../store/whiteboard'

const mockUseUndo = vi.mocked(useUndoStore)
const mockUseWB = vi.mocked(useWhiteboardStore)
const mockPop = vi.fn()
const mockClear = vi.fn()
const mockAddWidget = vi.fn()

const mockWidget = {
  id: 'w1',
  type: 'clock',
  variantId: 'digital',
  x: 100,
  y: 100,
  width: 300,
  height: 200,
  databaseTitle: '',
}

function setEmptyStack() {
  mockUseUndo.mockImplementation((selector?: any) => {
    const state = { stack: [], pop: mockPop, clear: mockClear }
    return selector ? selector(state) : state
  })
}

function setStackWithEntry() {
  mockUseUndo.mockImplementation((selector?: any) => {
    const state = {
      stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
      pop: mockPop,
      clear: mockClear,
    }
    return selector ? selector(state) : state
  })
}

describe('UndoToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setEmptyStack()
    mockUseWB.mockImplementation((selector?: any) => {
      const state = { addWidget: mockAddWidget }
      return selector ? selector(state) : state
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when stack is empty', () => {
    const { container } = render(<UndoToast />)
    expect(container.firstChild).toBeNull()
  })

  it('shows toast when stack has an entry', () => {
    setStackWithEntry()
    render(<UndoToast />)
    expect(screen.getByText('Widget deleted')).toBeInTheDocument()
  })

  it('shows Undo button', () => {
    setStackWithEntry()
    render(<UndoToast />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('shows stack count when multiple entries', () => {
    mockUseUndo.mockImplementation((selector?: any) => {
      const state = {
        stack: [
          { id: 'u1', label: 'Widget deleted', snapshot: mockWidget },
          { id: 'u2', label: 'Widget deleted', snapshot: mockWidget },
        ],
        pop: mockPop,
        clear: mockClear,
      }
      return selector ? selector(state) : state
    })
    render(<UndoToast />)
    expect(screen.getByText('Widget deleted (2)')).toBeInTheDocument()
  })

  it('calls pop and addWidget when Undo is clicked', () => {
    mockPop.mockReturnValue({ id: 'u1', label: 'Widget deleted', snapshot: mockWidget })
    setStackWithEntry()

    render(<UndoToast />)
    fireEvent.click(screen.getByText('Undo'))
    expect(mockPop).toHaveBeenCalled()
    expect(mockAddWidget).toHaveBeenCalledWith(mockWidget)
  })

  it('calls clear when X button is clicked', () => {
    setStackWithEntry()
    render(<UndoToast />)
    const closeBtn = document.querySelector('.wt-action-btn')
    if (closeBtn) fireEvent.click(closeBtn)
    expect(mockClear).toHaveBeenCalled()
  })

  it('auto-dismisses after 5 seconds', () => {
    setStackWithEntry()
    render(<UndoToast />)
    act(() => { vi.advanceTimersByTime(5100) })
    expect(mockClear).toHaveBeenCalled()
  })
})
