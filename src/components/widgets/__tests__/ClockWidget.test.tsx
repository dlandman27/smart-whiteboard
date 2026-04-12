import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    display: 'digital',
    use24h: false,
    showSeconds: true,
    showDate: true,
    font: 'thin',
    timezone: '',
    showTimezone: false,
    showHourNumbers: false,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { ClockWidget, DigitalClockWidget, AnalogClockWidget } from '../ClockWidget'

describe('ClockWidget (legacy combined)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<ClockWidget widgetId="test-clock-1" />)
  })

  it('displays time digits', () => {
    const { container } = render(<ClockWidget widgetId="test-clock-2" />)
    // Should render some numeric text (time)
    expect(container.textContent).toMatch(/\d{2}:\d{2}/)
  })
})

describe('DigitalClockWidget', () => {
  it('renders without crashing', () => {
    render(<DigitalClockWidget widgetId="test-digital-1" />)
  })

  it('displays time digits', () => {
    const { container } = render(<DigitalClockWidget widgetId="test-digital-2" />)
    expect(container.textContent).toMatch(/\d{2}:\d{2}/)
  })
})

describe('AnalogClockWidget', () => {
  it('renders without crashing', () => {
    render(<AnalogClockWidget widgetId="test-analog-1" />)
  })

  it('renders an SVG clock face', () => {
    const { container } = render(<AnalogClockWidget widgetId="test-analog-2" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
