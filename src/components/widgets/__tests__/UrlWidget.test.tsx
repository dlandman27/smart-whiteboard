import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    url: '',
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

import { UrlWidget } from '../UrlWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('UrlWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<UrlWidget widgetId="test-url-1" />)
  })

  it('shows empty state when no URL set', () => {
    render(<UrlWidget widgetId="test-url-2" />)
    expect(screen.getByText(/no url set/i)).toBeInTheDocument()
  })

  it('renders iframe when URL is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      url: 'https://example.com',
      title: '',
    }, vi.fn()])
    const { container } = render(<UrlWidget widgetId="test-url-3" />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.src).toContain('example.com')
  })

  it('shows title when set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      url: 'https://example.com',
      title: 'My Embed',
    }, vi.fn()])
    render(<UrlWidget widgetId="test-url-4" />)
    expect(screen.getByText('My Embed')).toBeInTheDocument()
  })
})
