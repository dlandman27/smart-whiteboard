import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{ timers: [] }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { TimersWidget } from '../TimersWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('TimersWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<TimersWidget widgetId="test-timers-1" />)
  })

  it('shows empty state when no timers', () => {
    render(<TimersWidget widgetId="test-timers-2" />)
    expect(screen.getByText(/no timers yet/i)).toBeInTheDocument()
  })

  it('shows timer when one exists', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      timers: [{
        id: 't1',
        label: 'Eggs',
        durationSeconds: 600,
        remainingSeconds: 300,
        isRunning: false,
      }],
    }, vi.fn()])
    render(<TimersWidget widgetId="test-timers-3" />)
    expect(screen.getByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText('5:00')).toBeInTheDocument()
  })

  it('shows add form', () => {
    render(<TimersWidget widgetId="test-timers-4" />)
    expect(screen.getByText('Add')).toBeInTheDocument()
  })
})
