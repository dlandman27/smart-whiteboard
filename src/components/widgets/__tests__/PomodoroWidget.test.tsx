import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

vi.mock('../../../store/notifications', () => ({
  useNotificationStore: vi.fn((selector: any) => {
    const store = {
      addNotification: vi.fn(),
      dismissAllByWidget: vi.fn(),
    }
    return selector(store)
  }),
}))

import { PomodoroWidget } from '../PomodoroWidget'

describe('PomodoroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<PomodoroWidget widgetId="test-pomo-1" />)
  })

  it('shows Focus phase label', () => {
    render(<PomodoroWidget widgetId="test-pomo-2" />)
    expect(screen.getByText('Focus')).toBeInTheDocument()
  })

  it('displays initial timer of 25:00', () => {
    render(<PomodoroWidget widgetId="test-pomo-3" />)
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('renders progress ring SVG', () => {
    const { container } = render(<PomodoroWidget widgetId="test-pomo-4" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
