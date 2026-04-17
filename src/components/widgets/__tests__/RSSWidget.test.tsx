import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    feedUrl: '',
    feedName: '',
    limit: 10,
    showThumbnails: true,
    autoScroll: false,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { RSSWidget } from '../RSSWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('RSSWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<RSSWidget widgetId="test-rss-1" />)
  })

  it('shows empty state when no feed URL set', () => {
    render(<RSSWidget widgetId="test-rss-2" />)
    expect(screen.getByText(/add an rss feed url in settings/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching feed', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/feed.xml',
      feedName: '',
      limit: 10,
      showThumbnails: true,
      autoScroll: false,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<RSSWidget widgetId="test-rss-3" />)
    expect(screen.getByText(/loading feed/i)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/feed.xml',
      feedName: '',
      limit: 10,
      showThumbnails: true,
      autoScroll: false,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Error', { status: 500 }))
    render(<RSSWidget widgetId="test-rss-4" />)
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument()
    })
  })

  it('shows articles when feed loads', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      feedUrl: 'https://example.com/feed.xml',
      feedName: '',
      limit: 10,
      showThumbnails: true,
      autoScroll: false,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        title: 'Tech News',
        description: 'Latest tech news',
        items: [
          { title: 'Breaking: New Release', link: 'https://example.com/1', pubDate: new Date().toISOString() },
        ],
      }))
    )
    render(<RSSWidget widgetId="test-rss-5" />)
    await waitFor(() => {
      expect(screen.getByText('Breaking: New Release')).toBeInTheDocument()
    })
  })
})
