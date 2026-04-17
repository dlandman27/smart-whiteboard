import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockSetBoardWidgetStyle = vi.fn()
const mockSetBoardBackground = vi.fn()
const mockSetLayoutSpacing = vi.fn()
const mockRenameBoard = vi.fn()
const mockOnClose = vi.fn()

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [
        {
          id: 'b1',
          name: 'My Board',
          widgets: [],
          boardType: undefined,
          widgetStyle: 'solid',
          slotGap: 12,
          slotPad: 16,
          background: undefined,
        },
      ],
      activeBoardId: 'b1',
      setBoardWidgetStyle: mockSetBoardWidgetStyle,
      setBoardBackground: mockSetBoardBackground,
      setLayoutSpacing: mockSetLayoutSpacing,
      renameBoard: mockRenameBoard,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn((selector?: any) => {
    const state = { background: { type: 'color', bg: '#000000' } }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../hooks/useLayout', () => ({
  DEFAULT_SLOT_GAP: 12,
  DEFAULT_SLOT_PAD: 16,
}))

vi.mock('../BackgroundPicker', () => ({
  BackgroundPicker: ({ onSelect }: { onSelect: (bg: any) => void }) => (
    <div data-testid="background-picker">
      <button onClick={() => onSelect({ type: 'color', bg: '#ffffff' })}>
        Pick Background
      </button>
    </div>
  ),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`}>{icon}</span>,
}))

import { BoardSettingsPanel } from '../BoardSettingsPanel'

describe('BoardSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByText('My Board')).toBeInTheDocument()
  })

  it('renders the board name input', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    const input = screen.getByDisplayValue('My Board')
    expect(input).toBeInTheDocument()
  })

  it('renders widget style options', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByText('Solid')).toBeInTheDocument()
    expect(screen.getByText('Glass')).toBeInTheDocument()
    expect(screen.getByText('Borderless')).toBeInTheDocument()
  })

  it('renders style descriptions', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByText('Opaque background with shadow')).toBeInTheDocument()
    expect(screen.getByText('Frosted blur with transparency')).toBeInTheDocument()
    expect(screen.getByText('Content only, no frame')).toBeInTheDocument()
  })

  it('clicking a widget style calls setBoardWidgetStyle', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    const glassBtn = screen.getByText('Glass').closest('button')!
    fireEvent.click(glassBtn)
    expect(mockSetBoardWidgetStyle).toHaveBeenCalledWith('b1', 'glass')
  })

  it('renders background picker section', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByTestId('background-picker')).toBeInTheDocument()
  })

  it('selecting a background calls setBoardBackground', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    fireEvent.click(screen.getByText('Pick Background'))
    expect(mockSetBoardBackground).toHaveBeenCalledWith('b1', { type: 'color', bg: '#ffffff' })
  })

  it('renders slot spacing section with Gap and Padding labels', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByText('Gap')).toBeInTheDocument()
    expect(screen.getByText('Padding')).toBeInTheDocument()
  })

  it('renders gap preset buttons', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getAllByText('None').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SM').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MD').length).toBeGreaterThan(0)
  })

  it('renaming the board on blur calls renameBoard when changed', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    const input = screen.getByDisplayValue('My Board')
    fireEvent.change(input, { target: { value: 'Renamed Board' } })
    fireEvent.blur(input)
    expect(mockRenameBoard).toHaveBeenCalledWith('b1', 'Renamed Board')
  })

  it('pressing Enter in board name input blurs it', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    const input = screen.getByDisplayValue('My Board') as HTMLInputElement
    const blurSpy = vi.spyOn(input, 'blur')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(blurSpy).toHaveBeenCalled()
  })

  it('closes on Escape key', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('renders close button with X icon', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(screen.getByTestId('icon-X')).toBeInTheDocument()
  })

  it('clicking close button calls onClose', () => {
    render(<BoardSettingsPanel onClose={mockOnClose} />)
    // The close button has the X icon
    const closeBtn = screen.getByTestId('icon-X').closest('button')!
    fireEvent.click(closeBtn)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('does not render when active board has a boardType', async () => {
    const { useWhiteboardStore } = await import('../../store/whiteboard')
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [
          {
            id: 'settings-id',
            name: 'Settings',
            widgets: [],
            boardType: 'settings',
            widgetStyle: 'solid',
            slotGap: 12,
            slotPad: 16,
          },
        ],
        activeBoardId: 'settings-id',
        setBoardWidgetStyle: mockSetBoardWidgetStyle,
        setBoardBackground: mockSetBoardBackground,
        setLayoutSpacing: mockSetLayoutSpacing,
        renameBoard: mockRenameBoard,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })
    const { container } = render(<BoardSettingsPanel onClose={mockOnClose} />)
    expect(container.firstChild).toBeNull()
  })
})
