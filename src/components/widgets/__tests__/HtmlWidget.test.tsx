import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    html: '',
    title: '',
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { HtmlWidget } from '../HtmlWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('HtmlWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<HtmlWidget widgetId="test-html-1" />)
  })

  it('shows empty state when no HTML set', () => {
    render(<HtmlWidget widgetId="test-html-2" />)
    expect(screen.getByText(/no html set/i)).toBeInTheDocument()
  })

  it('renders iframe when HTML is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      html: '<h1>Hello World</h1>',
      title: 'My Widget',
    }, vi.fn()])
    const { container } = render(<HtmlWidget widgetId="test-html-3" />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.title).toBe('My Widget')
  })
})
