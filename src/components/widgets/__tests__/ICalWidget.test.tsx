import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    feedUrl: '',
    feedName: '',
    days: 7,
    showLocation: true,
    showAllDay: true,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { ICalWidget } from '../ICalWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('ICalWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<ICalWidget widgetId="test-ical-1" />)
  })

  it('shows empty state when no feed URL configured', () => {
    render(<ICalWidget widgetId="test-ical-2" />)
    expect(screen.getByText(/add a calendar feed url in settings/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/cal.ics',
      feedName: '',
      days: 7,
      showLocation: true,
      showAllDay: true,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<ICalWidget widgetId="test-ical-3" />)
    expect(screen.getByText(/loading calendar/i)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/cal.ics',
      feedName: '',
      days: 7,
      showLocation: true,
      showAllDay: true,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Server Error', { status: 500 }))
    render(<ICalWidget widgetId="test-ical-4" />)
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument()
    })
  })

  it('shows no upcoming events when data returns empty events', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/cal.ics',
      feedName: '',
      days: 7,
      showLocation: true,
      showAllDay: true,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ calendarName: 'My Cal', events: [] }))
    )
    render(<ICalWidget widgetId="test-ical-5" />)
    await waitFor(() => {
      expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument()
    })
  })

  it('renders events when data is available', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/cal.ics',
      feedName: 'Work Calendar',
      days: 7,
      showLocation: true,
      showAllDay: false,
    }, vi.fn()])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const futureDateStr = futureDate.toISOString()
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        calendarName: 'My Calendar',
        events: [
          {
            uid: 'evt-1',
            title: 'Team Standup',
            start: futureDateStr,
            end: futureDateStr,
            location: 'Zoom',
            allDay: false,
          },
        ],
      }))
    )
    render(<ICalWidget widgetId="test-ical-6" />)
    await waitFor(() => {
      expect(screen.getByText('Team Standup')).toBeInTheDocument()
    })
    expect(screen.getByText('Work Calendar')).toBeInTheDocument()
  })

  it('shows location when showLocation is true and event has location', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/cal.ics',
      feedName: '',
      days: 7,
      showLocation: true,
      showAllDay: true,
    }, vi.fn()])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        calendarName: 'My Calendar',
        events: [
          {
            uid: 'evt-2',
            title: 'Conference Room Meetup',
            start: futureDate.toISOString(),
            allDay: false,
            location: 'Room 42',
          },
        ],
      }))
    )
    render(<ICalWidget widgetId="test-ical-7" />)
    await waitFor(() => {
      expect(screen.getByText('Conference Room Meetup')).toBeInTheDocument()
      expect(screen.getByText('Room 42')).toBeInTheDocument()
    })
  })
})
