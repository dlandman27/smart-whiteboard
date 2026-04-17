import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodayBoardView } from '../TodayBoardView'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useGCal', () => ({
  useGCalStatus:         vi.fn().mockReturnValue({ data: { connected: false } }),
  useGCalCalendars:      vi.fn().mockReturnValue({ data: { items: [] } }),
  useAllCalendarEvents:  vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('../../hooks/useTasks', () => ({
  useTasksStatus: vi.fn().mockReturnValue({ data: { connected: false } }),
  useTaskLists:   vi.fn().mockReturnValue({ data: { items: [] } }),
  useAllTasks:    vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('../../hooks/useWeather', () => ({
  useWeather: vi.fn().mockReturnValue({ data: null }),
}))

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    Icon: ({ icon }: any) => <span data-testid={`icon-${icon}`} />,
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderView() {
  return render(
    <QueryClientProvider client={makeQC()}>
      <TodayBoardView />
    </QueryClientProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TodayBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing (smoke test)', () => {
    renderView()
    // Always shows Today's Schedule
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument()
  })

  it("shows Today's Schedule and Tasks sections", () => {
    renderView()
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('shows greeting based on current time', () => {
    renderView()
    // One of the three greetings will appear
    const greeting = screen.queryByText(/Good morning|Good afternoon|Good evening/i)
    expect(greeting).toBeInTheDocument()
  })

  it('shows current date string', () => {
    renderView()
    const now = new Date()
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    expect(screen.getByText(new RegExp(dayName, 'i'))).toBeInTheDocument()
  })

  it('shows empty state for events when no calendar connected', () => {
    renderView()
    expect(screen.getByText('No events today')).toBeInTheDocument()
  })

  it('shows all caught up when no tasks', () => {
    renderView()
    expect(screen.getByText('All caught up')).toBeInTheDocument()
  })

  it('shows loading weather placeholder when weather is null', () => {
    renderView()
    expect(screen.getByText(/Loading weather/i)).toBeInTheDocument()
  })

  it('shows weather data when available', async () => {
    const { useWeather } = await import('../../hooks/useWeather')
    vi.mocked(useWeather).mockReturnValue({
      data: {
        temperature: 72,
        apparentTemperature: 70,
        weatherCode: 0,
        humidity: 40,
        windSpeed: 5,
        tempMax: 75,
        tempMin: 65,
        city: 'San Francisco',
        unit: 'fahrenheit',
        windUnit: 'mph',
      },
    } as any)
    renderView()
    expect(screen.getByText('72°F')).toBeInTheDocument()
    expect(screen.getByText('San Francisco')).toBeInTheDocument()
  })

  it('shows events when gcal is connected with events', async () => {
    const { useGCalStatus, useGCalCalendars, useAllCalendarEvents } = await import('../../hooks/useGCal')
    const now = new Date()
    const start = new Date(now); start.setHours(now.getHours() + 1, 0, 0, 0)
    const end = new Date(now); end.setHours(now.getHours() + 2, 0, 0, 0)
    vi.mocked(useGCalStatus).mockReturnValue({ data: { connected: true } } as any)
    vi.mocked(useGCalCalendars).mockReturnValue({
      data: { items: [{ id: 'primary', summary: 'My Calendar', backgroundColor: '#4285f4' }] }
    } as any)
    vi.mocked(useAllCalendarEvents).mockReturnValue({
      data: [{
        id: 'evt1',
        summary: 'Morning Meeting',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }]
    } as any)
    renderView()
    await waitFor(() => {
      expect(screen.getByText('Morning Meeting')).toBeInTheDocument()
    })
  })

  it('shows tasks when tasks are connected', async () => {
    const { useTasksStatus, useTaskLists, useAllTasks } = await import('../../hooks/useTasks')
    vi.mocked(useTasksStatus).mockReturnValue({ data: { connected: true } } as any)
    vi.mocked(useTaskLists).mockReturnValue({
      data: { items: [{ id: 'list1', title: 'My Tasks', updated: '' }] }
    } as any)
    vi.mocked(useAllTasks).mockReturnValue({
      data: [
        { id: 't1', title: 'Write tests', status: 'needsAction', updated: '' },
        { id: 't2', title: 'Deploy app', status: 'needsAction', updated: '' },
      ]
    } as any)
    renderView()
    await waitFor(() => {
      expect(screen.getByText('Write tests')).toBeInTheDocument()
      expect(screen.getByText('Deploy app')).toBeInTheDocument()
    })
  })

  it('shows a daily quote at the bottom', () => {
    renderView()
    // Quote is always rendered (from QUOTES array)
    const quoteText = document.querySelector('[style*="italic"]')
    expect(quoteText).toBeTruthy()
  })

  it('shows background image div', () => {
    renderView()
    // Background image container (jsdom lowercases inline style properties)
    const allDivs = document.querySelectorAll('div')
    const bgDivs = Array.from(allDivs).filter(d =>
      d.getAttribute('style')?.includes('background-image') ||
      d.getAttribute('style')?.includes('backgroundImage') ||
      d.getAttribute('style')?.includes('url(')
    )
    // The component unconditionally renders a background-image div
    expect(bgDivs.length).toBeGreaterThan(0)
  })
})
