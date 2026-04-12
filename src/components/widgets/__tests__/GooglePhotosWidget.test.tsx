import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    interval: 30,
    fitMode: 'cover',
    showCounter: false,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { GooglePhotosWidget } from '../GooglePhotosWidget'

describe('GooglePhotosWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: false }))
    )
    render(<GooglePhotosWidget widgetId="test-gphotos-1" />)
  })

  it('shows loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<GooglePhotosWidget widgetId="test-gphotos-2" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows not connected state', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connected: false }))
    )
    render(<GooglePhotosWidget widgetId="test-gphotos-3" />)
    await waitFor(() => {
      expect(screen.getByText(/connect your google account/i)).toBeInTheDocument()
    })
  })

  it('shows loading photos state when connected but no photos yet', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/status')) {
        return Promise.resolve(new Response(JSON.stringify({ connected: true })))
      }
      if (url.includes('/photos')) {
        return Promise.resolve(new Response(JSON.stringify({ items: [] })))
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    })
    render(<GooglePhotosWidget widgetId="test-gphotos-4" />)
    await waitFor(() => {
      expect(screen.getByText(/loading photos/i)).toBeInTheDocument()
    })
  })
})
