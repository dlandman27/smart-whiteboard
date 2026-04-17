import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockSetActiveBoardManual = vi.fn()
const mockAddBoard = vi.fn()
const mockRemoveBoard = vi.fn()
const mockOnClose = vi.fn()
const mockOnSlide = vi.fn()

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
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../BoardThumbnail', () => ({
  BoardThumbnail: ({ board }: { board: { name: string } }) => (
    <div data-testid={`thumbnail-${board.name}`} />
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
  IconButton: ({ icon, onClick }: { icon: string; onClick?: () => void }) => (
    <button data-testid={`icon-btn-${icon}`} onClick={onClick}>{icon}</button>
  ),
  Panel: ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
    <div data-testid="panel" onClick={onClose}>{children}</div>
  ),
  PanelHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div data-testid="panel-header">
      <span>{title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
  Input: ({ placeholder, value, onChange, onKeyDown }: any) => (
    <input placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} />
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Text: ({ children, as: Tag = 'span' }: { children: React.ReactNode; as?: string }) => (
    <Tag>{children}</Tag>
  ),
}))

import { BoardMenu } from '../BoardMenu'

describe('BoardMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('shows the Boards panel header', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    expect(screen.getByText('Boards')).toBeInTheDocument()
  })

  it('renders all boards in the list', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('renders thumbnails for each board', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    expect(screen.getByTestId('thumbnail-Main')).toBeInTheDocument()
    expect(screen.getByTestId('thumbnail-Work')).toBeInTheDocument()
  })

  it('renders the "New board" button', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    expect(screen.getByText('New board')).toBeInTheDocument()
  })

  it('clicking "New board" shows input field', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByText('New board'))
    expect(screen.getByPlaceholderText('Board name…')).toBeInTheDocument()
  })

  it('adds a board when name is entered and Add is clicked', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByText('New board'))
    fireEvent.change(screen.getByPlaceholderText('Board name…'), { target: { value: 'My New Board' } })
    fireEvent.click(screen.getByText('Add'))
    expect(mockAddBoard).toHaveBeenCalledWith('My New Board')
  })

  it('adds board via Enter key in input', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByText('New board'))
    const input = screen.getByPlaceholderText('Board name…')
    fireEvent.change(input, { target: { value: 'Keyboard Board' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockAddBoard).toHaveBeenCalledWith('Keyboard Board')
  })

  it('cancels new board entry via Escape key', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    fireEvent.click(screen.getByText('New board'))
    const input = screen.getByPlaceholderText('Board name…')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Board name…')).not.toBeInTheDocument()
  })

  it('clicking a non-active board switches to it', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    // Work board button
    const workText = screen.getByText('Work')
    const workBtn = workText.closest('button')!
    fireEvent.click(workBtn)
    expect(mockSetActiveBoardManual).toHaveBeenCalledWith('b2')
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows check icon on active board', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    // Active board is b1 (Main) — Check icon should appear
    expect(screen.getByTestId('icon-Check')).toBeInTheDocument()
  })

  it('closes on Escape keydown', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders delete (Trash) buttons when there are multiple boards', () => {
    render(<BoardMenu onClose={mockOnClose} onSlide={mockOnSlide} />)
    const trashBtns = screen.getAllByTestId('icon-Trash')
    expect(trashBtns.length).toBe(2) // one per board
  })
})
