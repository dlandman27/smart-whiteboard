import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    showRefresh: true,
    fontSize: 'md',
    align: 'center',
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { QuoteWidget } from '../QuoteWidget'

describe('QuoteWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ quote: 'Test', author: 'Author' })))
    render(<QuoteWidget widgetId="test-quote-1" />)
  })

  it('shows loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {})) // never resolves
    render(<QuoteWidget widgetId="test-quote-2" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    render(<QuoteWidget widgetId="test-quote-3" />)
    await waitFor(() => {
      expect(screen.getByText(/could not load quote/i)).toBeInTheDocument()
    })
  })

  it('shows quote when fetch succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quote: 'Be yourself.', author: 'Oscar Wilde' }))
    )
    render(<QuoteWidget widgetId="test-quote-4" />)
    await waitFor(() => {
      expect(screen.getByText('Be yourself.')).toBeInTheDocument()
      expect(screen.getByText(/oscar wilde/i)).toBeInTheDocument()
    })
  })
})
