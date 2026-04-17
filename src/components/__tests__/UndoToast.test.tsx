import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

const mockPop = vi.fn()
const mockClear = vi.fn()
const mockAddWidget = vi.fn()

vi.mock('../../store/undo', () => ({
  useUndoStore: vi.fn((selector) =>
    selector({
      stack: [],
      pop: mockPop,
      clear: mockClear,
    })
  ),
}))

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector) =>
    selector({
      addWidget: mockAddWidget,
    })
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { UndoToast } from '../UndoToast'

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

describe('UndoToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when stack is empty', () => {
    const { container } = render(<UndoToast />)
    expect(container.firstChild).toBeNull()
  })

  it('shows toast when stack has an entry', () => {
    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    expect(screen.getByText('Widget deleted')).toBeInTheDocument()
  })

  it('shows Undo button', () => {
    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('shows stack count when multiple entries', () => {
    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [
          { id: 'u1', label: 'Widget deleted', snapshot: mockWidget },
          { id: 'u2', label: 'Widget deleted', snapshot: mockWidget },
        ],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    expect(screen.getByText('Widget deleted (2)')).toBeInTheDocument()
  })

  it('calls pop and addWidget when Undo is clicked', () => {
    mockPop.mockReturnValue({ id: 'u1', label: 'Widget deleted', snapshot: mockWidget })

    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    fireEvent.click(screen.getByText('Undo'))
    expect(mockPop).toHaveBeenCalled()
    expect(mockAddWidget).toHaveBeenCalledWith(mockWidget)
  })

  it('calls clear when X button is clicked', () => {
    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    const closeBtn = document.querySelector('.wt-action-btn')
    if (closeBtn) fireEvent.click(closeBtn)
    expect(mockClear).toHaveBeenCalled()
  })

  it('auto-dismisses after 5 seconds', () => {
    const { useUndoStore } = require('../../store/undo')
    useUndoStore.mockImplementation((selector: any) =>
      selector({
        stack: [{ id: 'u1', label: 'Widget deleted', snapshot: mockWidget }],
        pop: mockPop,
        clear: mockClear,
      })
    )

    render(<UndoToast />)
    act(() => { vi.advanceTimersByTime(5100) })
    expect(mockClear).toHaveBeenCalled()
  })
})
