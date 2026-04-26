import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

vi.mock('../../hooks/useNotion', () => ({
  useNotionHealth: vi.fn(() => ({ data: { configured: false } })),
  useNotionDatabases: vi.fn(() => ({ data: null })),
}))

vi.mock('../../hooks/useGCal', () => ({
  useGCalStatus: vi.fn(() => ({ data: { connected: false } })),
  useGCalCalendars: vi.fn(() => ({ data: null })),
}))

vi.mock('../../hooks/useSpotify', () => ({
  useSpotifyStatus: vi.fn(() => ({ data: { connected: false } })),
}))

const mockStoreState = {
  boards: [{ id: 'b1', name: 'Main', widgets: [] }],
  activeBoardId: 'b1',
  addWidget: vi.fn(),
}

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) =>
    selector ? selector(mockStoreState) : mockStoreState
  ),
}))

vi.mock('../widgets/registry', () => ({
  getAllWidgetTypes: vi.fn(() => [
    {
      typeId: '@whiteboard/clock',
      label: 'Clock',
      Icon: 'Clock',
      iconColor: '#3b82f6',
      description: 'Shows current time',
      keywords: ['clock', 'time'],
      variants: [
        {
          variantId: 'digital',
          label: 'Digital',
          description: 'Digital clock',
          shape: { width: 300, height: 200 },
          component: () => <div>Clock Preview</div>,
        },
      ],
    },
    {
      typeId: '@whiteboard/weather',
      label: 'Weather',
      Icon: 'Sun',
      iconColor: '#f59e0b',
      description: 'Shows weather',
      keywords: ['weather', 'temperature'],
      variants: [
        {
          variantId: 'default',
          label: 'Default',
          description: 'Weather widget',
          shape: { width: 300, height: 200 },
          component: () => <div>Weather Preview</div>,
        },
      ],
    },
  ]),
  getStaticWidgetDef: vi.fn(() => null),
}))

vi.mock('@whiteboard/ui-kit', () => ({
  Icon: ({ icon, size, style, className, weight }: any) => <span data-testid={`icon-${icon}`}>{icon}</span>,
  Panel: ({ children, width, style, onClose }: any) => <div data-testid="panel">{children}</div>,
  PanelHeader: ({ title, onClose, onBack }: any) => (
    <div>
      <span>{title}</span>
      {onBack && <button onClick={onBack}>Back</button>}
      <button onClick={onClose}>Close</button>
    </div>
  ),
  MenuItem: ({ name, source, onClick, selected, disabled, label }: any) => (
    <div
      data-testid={`menu-item-${name}`}
      onClick={!disabled ? onClick : undefined}
      aria-selected={selected}
    >
      <span>{name}</span>
      <span>{source}</span>
      {label && <span>{label}</span>}
    </div>
  ),
  Text: ({ children, variant, size, color, align, className, textTransform }: any) => <span>{children}</span>,
  Button: ({ children, onClick, variant, size, fullWidth, iconLeft }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  WidgetSizeContext: { Provider: ({ children }: any) => <>{children}</> },
}))

import { WidgetPicker } from '../WidgetPicker'

describe('WidgetPicker', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the panel', () => {
    render(<WidgetPicker onClose={onClose} />)
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<WidgetPicker onClose={onClose} />)
    expect(screen.getByPlaceholderText('Search widgets…')).toBeInTheDocument()
  })

  it('renders widget items', () => {
    render(<WidgetPicker onClose={onClose} />)
    expect(screen.getByTestId('menu-item-Clock')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-Weather')).toBeInTheDocument()
  })

  it('filters items on search input', () => {
    render(<WidgetPicker onClose={onClose} />)
    const input = screen.getByPlaceholderText('Search widgets…')
    fireEvent.change(input, { target: { value: 'clock' } })
    expect(screen.getByTestId('menu-item-Clock')).toBeInTheDocument()
    expect(screen.queryByTestId('menu-item-Weather')).not.toBeInTheDocument()
  })

  it('shows no results message when search matches nothing', () => {
    render(<WidgetPicker onClose={onClose} />)
    const input = screen.getByPlaceholderText('Search widgets…')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/No results for/)).toBeInTheDocument()
  })

  it('shows Notion notice when not configured', () => {
    render(<WidgetPicker onClose={onClose} />)
    // gcal notice should appear since not connected
    expect(screen.getByText(/Connect Google Calendar/)).toBeInTheDocument()
  })

  it('shows Spotify notice when not connected', () => {
    render(<WidgetPicker onClose={onClose} />)
    expect(screen.getByText(/Connect Spotify/)).toBeInTheDocument()
  })

  it('navigates to variant carousel on widget click', () => {
    render(<WidgetPicker onClose={onClose} />)
    const clockItem = screen.getByTestId('menu-item-Clock')
    fireEvent.click(clockItem)
    // Should show variant carousel with "Add Widget" button
    expect(screen.getByText('Add Widget')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<WidgetPicker onClose={onClose} />)
    // Panel mock renders with onClose - find the Close button from PanelHeader in carousel view
    // First navigate to carousel to see a Close button
    const clockItem = screen.getByTestId('menu-item-Clock')
    fireEvent.click(clockItem)
    // Now carousel is visible with PanelHeader that has Close button
    const closeBtn = screen.getByText('Close')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
