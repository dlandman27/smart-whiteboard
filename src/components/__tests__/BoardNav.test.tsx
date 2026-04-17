import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockSetActiveBoardManual = vi.fn()
const mockAddBoard = vi.fn()
const mockRenameBoard = vi.fn()
const mockOnSlide = vi.fn()

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [
        { id: 'b1', name: 'First Board', widgets: [], boardType: undefined },
        { id: 'b2', name: 'Second Board', widgets: [], boardType: undefined },
        { id: 'b3', name: 'Third Board', widgets: [], boardType: undefined },
      ],
      activeBoardId: 'b2',
      setActiveBoardManual: mockSetActiveBoardManual,
      addBoard: mockAddBoard,
      renameBoard: mockRenameBoard,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../Pill', () => ({
  Pill: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="pill" className={className}>{children}</div>
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  IconButton: ({
    icon,
    onClick,
    disabled,
    title,
  }: {
    icon: string
    onClick?: () => void
    disabled?: boolean
    title?: string
  }) => (
    <button
      data-testid={`icon-btn-${icon}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </button>
  ),
}))

import { BoardNav } from '../BoardNav'

describe('BoardNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    expect(screen.getByTestId('pill')).toBeInTheDocument()
  })

  it('renders the active board name', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    expect(screen.getByText('Second Board')).toBeInTheDocument()
  })

  it('renders left and right navigation buttons', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    expect(screen.getByTestId('icon-btn-CaretLeft')).toBeInTheDocument()
    expect(screen.getByTestId('icon-btn-CaretRight')).toBeInTheDocument()
  })

  it('left button is enabled when there is a previous board', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    const leftBtn = screen.getByTestId('icon-btn-CaretLeft')
    expect(leftBtn).not.toBeDisabled()
  })

  it('right button is enabled when there is a next board', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    const rightBtn = screen.getByTestId('icon-btn-CaretRight')
    expect(rightBtn).not.toBeDisabled()
  })

  it('clicking left navigates to previous board', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByTestId('icon-btn-CaretLeft'))
    expect(mockOnSlide).toHaveBeenCalledWith('left')
    expect(mockSetActiveBoardManual).toHaveBeenCalledWith('b1')
  })

  it('clicking right navigates to next board', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByTestId('icon-btn-CaretRight'))
    expect(mockOnSlide).toHaveBeenCalledWith('right')
    expect(mockSetActiveBoardManual).toHaveBeenCalledWith('b3')
  })

  it('renders the Plus (add board) button', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    expect(screen.getByTestId('icon-btn-Plus')).toBeInTheDocument()
  })

  it('clicking Plus button enters naming mode', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByTestId('icon-btn-Plus'))
    expect(screen.getByPlaceholderText('Board name…')).toBeInTheDocument()
  })

  it('adding a board name via Enter calls addBoard', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByTestId('icon-btn-Plus'))
    const input = screen.getByPlaceholderText('Board name…')
    fireEvent.change(input, { target: { value: 'New Board' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockAddBoard).toHaveBeenCalledWith('New Board')
  })

  it('double-clicking the board name enters rename mode', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    const boardNameBtn = screen.getByText('Second Board')
    fireEvent.dblClick(boardNameBtn)
    const renameInput = screen.getByDisplayValue('Second Board')
    expect(renameInput).toBeInTheDocument()
  })

  it('commits rename on blur with valid value', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    const boardNameBtn = screen.getByText('Second Board')
    fireEvent.dblClick(boardNameBtn)
    const renameInput = screen.getByDisplayValue('Second Board')
    fireEvent.change(renameInput, { target: { value: 'Renamed Board' } })
    fireEvent.blur(renameInput)
    expect(mockRenameBoard).toHaveBeenCalledWith('b2', 'Renamed Board')
  })

  it('commits rename on Enter key', () => {
    render(<BoardNav onSlide={mockOnSlide} />)
    const boardNameBtn = screen.getByText('Second Board')
    fireEvent.dblClick(boardNameBtn)
    const renameInput = screen.getByDisplayValue('Second Board')
    fireEvent.change(renameInput, { target: { value: 'Updated Name' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })
    expect(mockRenameBoard).toHaveBeenCalledWith('b2', 'Updated Name')
  })
})
