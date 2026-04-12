import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3001/api/spotify/callback',
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { SpotifyWidget } from '../SpotifyWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('SpotifyWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: false }))
    )
    render(<SpotifyWidget widgetId="test-spotify-1" />)
  })

  it('shows unconfigured state when no credentials', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: false }))
    )
    render(<SpotifyWidget widgetId="test-spotify-2" />)
    await waitFor(() => {
      expect(screen.getByText(/open settings to connect/i)).toBeInTheDocument()
    })
  })

  it('shows connect button when credentials are set but not connected', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      clientId: 'test-id',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost:3001/api/spotify/callback',
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: false }))
    )
    render(<SpotifyWidget widgetId="test-spotify-3" />)
    await waitFor(() => {
      expect(screen.getByText(/connect spotify/i)).toBeInTheDocument()
    })
  })

  it('shows nothing playing when connected but no track', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      clientId: 'test-id',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost:3001/api/spotify/callback',
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/status')) {
        return Promise.resolve(new Response(JSON.stringify({ connected: true })))
      }
      if (url.includes('/now-playing')) {
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    render(<SpotifyWidget widgetId="test-spotify-4" />)
    await waitFor(() => {
      expect(screen.getByText(/nothing playing/i)).toBeInTheDocument()
    })
  })
})
