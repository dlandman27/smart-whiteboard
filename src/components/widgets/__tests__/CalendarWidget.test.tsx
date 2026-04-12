import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{ calendarId: '' }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

const mockUseGCalEvents = vi.fn()
vi.mock('../../../hooks/useGCal', () => ({
  useGCalEvents: (...args: any[]) => mockUseGCalEvents(...args),
}))

import { CalendarWidget } from '../CalendarWidget'

describe('CalendarWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockUseGCalEvents.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn(), isFetching: false })
    render(<CalendarWidget widgetId="test-cal-1" />)
  })

  it('shows loading state', () => {
    mockUseGCalEvents.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn(), isFetching: false })
    render(<CalendarWidget widgetId="test-cal-2" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseGCalEvents.mockReturnValue({ data: null, isLoading: false, error: new Error('Auth failed'), refetch: vi.fn(), isFetching: false })
    render(<CalendarWidget widgetId="test-cal-3" />)
    expect(screen.getByText(/failed to load events/i)).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    mockUseGCalEvents.mockReturnValue({ data: { items: [] }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false })
    render(<CalendarWidget widgetId="test-cal-4" />)
    expect(screen.getByText(/no events/i)).toBeInTheDocument()
  })

  it('shows events when data is available', () => {
    mockUseGCalEvents.mockReturnValue({
      data: {
        items: [{
          id: 'e1',
          summary: 'Team standup',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        }],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })
    render(<CalendarWidget widgetId="test-cal-5" />)
    expect(screen.getByText('Team standup')).toBeInTheDocument()
  })
})
