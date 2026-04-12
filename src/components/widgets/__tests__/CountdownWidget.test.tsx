import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    title: 'Countdown',
    targetDate: '',
    showTime: true,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { CountdownWidget } from '../CountdownWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('CountdownWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<CountdownWidget widgetId="test-countdown-1" />)
  })

  it('shows empty state when no date is set', () => {
    render(<CountdownWidget widgetId="test-countdown-2" />)
    expect(screen.getByText(/set a date in settings/i)).toBeInTheDocument()
  })

  it('shows countdown when target date is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      title: 'Christmas',
      targetDate: '2027-12-25',
      showTime: true,
    }, vi.fn()])
    render(<CountdownWidget widgetId="test-countdown-3" />)
    expect(screen.getByText('Christmas')).toBeInTheDocument()
    // Should show day count
    expect(screen.getByText(/days?/)).toBeInTheDocument()
  })

  it('shows days ago for past dates', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      title: 'Past Event',
      targetDate: '2020-01-01',
      showTime: true,
    }, vi.fn()])
    render(<CountdownWidget widgetId="test-countdown-4" />)
    expect(screen.getByText(/days? ago/)).toBeInTheDocument()
  })
})
