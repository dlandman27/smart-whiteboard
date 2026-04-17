import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockSetActiveBoardManual = vi.fn()
const mockAddBoard = vi.fn()
const mockRemoveBoard = vi.fn()
const mockReorderBoards = vi.fn()
const mockToggleDisplayMode = vi.fn()

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [
        { id: 'b1', name: 'Main', widgets: [], boardType: undefined },
        { id: 'b2', name: 'Work', widgets: [], boardType: undefined },
      ],
      activeBoardId: 'b1',
      setActiveBoardManual: mockSetActiveBoardManual,
      addBoard: mockAddBoard,
      removeBoard: mockRemoveBoard,
      reorderBoards: mockReorderBoards,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
  DEFAULT_SETTINGS_ID: 'settings-id',
  DEFAULT_CONNECTORS_ID: 'connectors-id',
  DEFAULT_TODAY_ID: 'today-id',
  DEFAULT_TODO_ID: 'todo-id',
  DEFAULT_FEEDBACK_ID: 'feedback-id',
}))

vi.mock('../../store/ui', () => ({
  useUIStore: vi.fn((selector: any) =>
    selector({
      toggleDisplayMode: mockToggleDisplayMode,
    })
  ),
}))

vi.mock('../Logo', () => ({
  Logo: ({ size }: { size: number }) => <div data-testid="logo" style={{ width: size }} />,
}))

vi.mock('../TemplatePicker', () => ({
  TemplatePicker: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="template-picker">
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<Sidebar />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the list of user boards', () => {
    render(<Sidebar />)
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('renders the Boards section label', () => {
    render(<Sidebar />)
    expect(screen.getByText('Boards')).toBeInTheDocument()
  })

  it('renders the "New board" button', () => {
    render(<Sidebar />)
    expect(screen.getByText('New board')).toBeInTheDocument()
  })

  it('clicking a board calls setActiveBoardManual', () => {
    render(<Sidebar />)
    // Find the "Work" board button
    const workButtons = screen.getAllByText('Work')
    fireEvent.click(workButtons[0])
    expect(mockSetActiveBoardManual).toHaveBeenCalledWith('b2')
  })

  it('renders nav buttons for Today, Calendar, Todo', () => {
    render(<Sidebar />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('renders nav buttons for Connectors, Settings, Feedback', () => {
    render(<Sidebar />)
    expect(screen.getByText('Connectors')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Feedback')).toBeInTheDocument()
  })

  it('clicking "New board" enters name-board step', () => {
    render(<Sidebar />)
    const newBoardBtn = screen.getByText('New board').closest('button')!
    fireEvent.click(newBoardBtn)
    expect(screen.getByPlaceholderText('Board name…')).toBeInTheDocument()
  })

  it('submitting a new board name calls addBoard', () => {
    render(<Sidebar />)
    const newBoardBtn = screen.getByText('New board').closest('button')!
    fireEvent.click(newBoardBtn)
    const input = screen.getByPlaceholderText('Board name…')
    fireEvent.change(input, { target: { value: 'New Board' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockAddBoard).toHaveBeenCalledWith('New Board', expect.any(String))
  })

  it('pressing Escape cancels new board input', () => {
    render(<Sidebar />)
    const newBoardBtn = screen.getByText('New board').closest('button')!
    fireEvent.click(newBoardBtn)
    const input = screen.getByPlaceholderText('Board name…')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Board name…')).not.toBeInTheDocument()
  })

  it('clicking the sidebar header toggles collapsed state', () => {
    render(<Sidebar />)
    const logo = screen.getByTestId('logo')
    const btn = logo.closest('button')!
    // Initially expanded — clicking collapses
    fireEvent.click(btn)
    // After collapse, "wiigit" text should be gone
    expect(screen.queryByText('wiigit')).not.toBeInTheDocument()
  })

  it('renders the logo', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('shows delete button on boards when more than 1 board exists', () => {
    render(<Sidebar />)
    const trashIcons = screen.getAllByTestId('icon-Trash')
    expect(trashIcons.length).toBeGreaterThan(0)
  })
})
