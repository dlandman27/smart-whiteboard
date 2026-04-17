import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarBoardView } from '../CalendarBoardView'

// ── Mock all hooks / external deps ────────────────────────────────────────────

vi.mock('../../hooks/useUnifiedEvents', () => ({
  useUnifiedEvents: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useEventGroups: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('../../hooks/useEventMutations', () => ({
  createUnifiedEvent: vi.fn().mockResolvedValue({}),
  deleteUnifiedEvent: vi.fn().mockResolvedValue({}),
}))

vi.mock('../ProviderIcon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => (
    <span data-testid="provider-icon">{provider}</span>
  ),
}))

// ── UI-kit mock (avoids complex CSS-var rendering) ────────────────────────────

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  const make = (tag: string, testId?: string) => {
    const Comp = ({ children, onClick, style, className, ...rest }: any) =>
      React.createElement(tag, { onClick, style, className, 'data-testid': testId }, children)
    return Comp
  }
  return {
    FlexRow:         make('div'),
    FlexCol:         make('div'),
    Box:             make('div'),
    Center:          make('div', 'center'),
    Text:            ({ children, ...p }: any) => <span {...p}>{children}</span>,
    Icon:            ({ icon }: any) => <span data-testid={`icon-${icon}`} />,
    IconButton:      ({ icon, onClick, title }: any) => (
      <button onClick={onClick} title={title} data-testid={`icon-btn-${icon}`}>{icon}</button>
    ),
    Button:          ({ children, onClick, variant, ...rest }: any) => (
      <button onClick={onClick} data-variant={variant} {...rest}>{children}</button>
    ),
    SegmentedControl: ({ value, options, onChange }: any) => (
      <div data-testid="segmented-control">
        {options.map((o: any) => (
          <button key={o.value} onClick={() => onChange(o.value)} data-active={value === o.value}>
            {o.label}
          </button>
        ))}
      </div>
    ),
    Divider:         () => <hr />,
    ScrollArea:      ({ children }: any) => <div>{children}</div>,
    Panel:           ({ children, onClose }: any) => <div data-testid="panel">{children}</div>,
    PanelHeader:     ({ title }: any) => <div data-testid="panel-header">{title}</div>,
    Input:           ({ label, value, onChange, ...rest }: any) => (
      <input aria-label={label} value={value} onChange={onChange} {...rest} />
    ),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderView() {
  const qc = makeQC()
  return render(
    <QueryClientProvider client={qc}>
      <CalendarBoardView />
    </QueryClientProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CalendarBoardView', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset to default (empty) state after each test to avoid leakage
    const { useUnifiedEvents, useEventGroups } = await import('../../hooks/useUnifiedEvents')
    vi.mocked(useUnifiedEvents).mockReturnValue({
      data: [], isLoading: false, isFetching: false, refetch: vi.fn(),
    } as any)
    vi.mocked(useEventGroups).mockReturnValue({ data: [], isLoading: false } as any)
  })

  it('renders without crashing (smoke test)', () => {
    renderView()
    // Header nav elements should be present
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows loading spinner when groups are loading and empty', async () => {
    const { useEventGroups } = await import('../../hooks/useUnifiedEvents')
    vi.mocked(useEventGroups).mockReturnValueOnce({
      data: [],
      isLoading: true,
    } as any)
    renderView()
    // The spinner is inside a Center element
    expect(document.querySelector('[data-testid="center"]')).toBeInTheDocument()
  })

  it('shows week view by default with segmented control', () => {
    renderView()
    const ctrl = screen.getByTestId('segmented-control')
    expect(ctrl).toBeInTheDocument()
    // Week button should be marked active
    const weekBtn = screen.getByRole('button', { name: 'Week' })
    expect(weekBtn).toHaveAttribute('data-active', 'true')
  })

  it('switches to Day view when Day is clicked', async () => {
    renderView()
    const dayBtn = screen.getByRole('button', { name: 'Day' })
    fireEvent.click(dayBtn)
    await waitFor(() => {
      expect(dayBtn).toHaveAttribute('data-active', 'true')
    })
  })

  it('switches to Month view when Month is clicked', async () => {
    renderView()
    const monthBtn = screen.getByRole('button', { name: 'Month' })
    fireEvent.click(monthBtn)
    await waitFor(() => {
      expect(monthBtn).toHaveAttribute('data-active', 'true')
    })
  })

  it('shows navigation arrows and nav label', () => {
    renderView()
    expect(screen.getByTestId('icon-btn-CaretLeft')).toBeInTheDocument()
    expect(screen.getByTestId('icon-btn-CaretRight')).toBeInTheDocument()
  })

  it('shows "New event" button', () => {
    renderView()
    expect(screen.getByText('New event')).toBeInTheDocument()
  })

  it('opens CreateEventModal when New event is clicked', async () => {
    renderView()
    const btn = screen.getByText('New event')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByTestId('panel-header')).toBeInTheDocument()
    })
  })

  it('shows loading text when events are loading', async () => {
    const { useUnifiedEvents, useEventGroups } = await import('../../hooks/useUnifiedEvents')
    vi.mocked(useEventGroups).mockReturnValue({ data: [
      { key: 'builtin:My Calendar', groupName: 'My Calendar', provider: 'builtin', readOnly: false, color: '#4285f4' }
    ], isLoading: false } as any)
    vi.mocked(useUnifiedEvents).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any)
    renderView()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders events when data is loaded', async () => {
    const { useUnifiedEvents, useEventGroups } = await import('../../hooks/useUnifiedEvents')
    const now = new Date()
    const start = new Date(now); start.setHours(10, 0, 0, 0)
    const end = new Date(now); end.setHours(11, 0, 0, 0)
    vi.mocked(useEventGroups).mockReturnValue({
      data: [{ key: 'builtin:My Calendar', groupName: 'My Calendar', provider: 'builtin', readOnly: false, color: '#4285f4' }],
      isLoading: false,
    } as any)
    vi.mocked(useUnifiedEvents).mockReturnValue({
      data: [{
        key: 'builtin:evt1',
        title: 'Team Standup',
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        groupName: 'My Calendar',
        source: { provider: 'builtin', id: 'evt1' },
        readOnly: false,
        color: '#4285f4',
      }],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any)
    renderView()
    await waitFor(() => {
      const els = screen.getAllByText('Team Standup')
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('shows empty week grid when events array is empty', async () => {
    renderView()
    // No events = segmented control present, no specific event text
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument()
    // Loading text also not showing (isLoading: false)
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('navigates to next period when right caret clicked', async () => {
    renderView()
    const rightBtn = screen.getByTestId('icon-btn-CaretRight')
    // Should not throw
    fireEvent.click(rightBtn)
  })

  it('navigates to previous period when left caret clicked', async () => {
    renderView()
    const leftBtn = screen.getByTestId('icon-btn-CaretLeft')
    fireEvent.click(leftBtn)
  })

  it('navigates back to today when Today is clicked', async () => {
    renderView()
    const todayBtn = screen.getByText('Today')
    fireEvent.click(todayBtn)
  })

  it('calls refetch when refresh button is clicked', async () => {
    const mockRefetch = vi.fn()
    const { useUnifiedEvents } = await import('../../hooks/useUnifiedEvents')
    vi.mocked(useUnifiedEvents).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    } as any)
    renderView()
    const refreshBtn = screen.getByTestId('icon-btn-ArrowsClockwise')
    fireEvent.click(refreshBtn)
    expect(mockRefetch).toHaveBeenCalled()
  })
})
