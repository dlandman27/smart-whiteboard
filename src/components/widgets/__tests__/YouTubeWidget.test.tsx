import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    videoId: '',
    autoplay: false,
    mute: true,
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

import { YouTubeWidget } from '../YouTubeWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('YouTubeWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<YouTubeWidget widgetId="test-yt-1" />)
  })

  it('shows empty state when no video set', () => {
    render(<YouTubeWidget widgetId="test-yt-2" />)
    expect(screen.getByText(/no video set/i)).toBeInTheDocument()
  })

  it('renders iframe when videoId is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      videoId: 'dQw4w9WgXcQ',
      autoplay: false,
      mute: true,
      title: '',
    }, vi.fn()])
    const { container } = render(<YouTubeWidget widgetId="test-yt-3" />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.src).toContain('dQw4w9WgXcQ')
  })

  it('shows title overlay when title is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      videoId: 'dQw4w9WgXcQ',
      autoplay: false,
      mute: true,
      title: 'My Video',
    }, vi.fn()])
    render(<YouTubeWidget widgetId="test-yt-4" />)
    expect(screen.getByText('My Video')).toBeInTheDocument()
  })
})
