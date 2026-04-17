import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    symbols: ['AAPL', 'GOOGL'],
    showChange: true,
    showPercent: true,
    compact: false,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { StockTickerWidget } from '../StockTickerWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

const DEFAULT_SETTINGS = {
  symbols: ['AAPL', 'GOOGL'],
  showChange: true,
  showPercent: true,
  compact: false,
}

const mockQuotes = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.5,
    change: 2.3,
    changePercent: 1.23,
    marketState: 'regular',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 140.2,
    change: -0.8,
    changePercent: -0.57,
    marketState: 'regular',
  },
]

describe('StockTickerWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWidgetSettings).mockReturnValue([DEFAULT_SETTINGS, vi.fn()])
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<StockTickerWidget widgetId="test-stock-1" />)
  })

  it('shows empty state when symbols array is empty', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      symbols: [],
      showChange: true,
      showPercent: true,
      compact: false,
    }, vi.fn()])
    render(<StockTickerWidget widgetId="test-stock-2" />)
    expect(screen.getByText(/add stock symbols in settings/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<StockTickerWidget widgetId="test-stock-3" />)
    expect(screen.getByText(/loading stocks/i)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Server Error', { status: 500 }))
    render(<StockTickerWidget widgetId="test-stock-4" />)
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument()
    })
  })

  it('renders stock data when fetch succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quotes: mockQuotes, fetchedAt: new Date().toISOString() }))
    )
    render(<StockTickerWidget widgetId="test-stock-5" />)
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('GOOGL')).toBeInTheDocument()
    })
    expect(screen.getByText('Stocks')).toBeInTheDocument()
  })

  it('shows market state label in header', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quotes: mockQuotes, fetchedAt: null }))
    )
    render(<StockTickerWidget widgetId="test-stock-6" />)
    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument()
    })
  })

  it('shows closed market state when market is closed', async () => {
    const closedQuotes = [{ ...mockQuotes[0], marketState: 'closed' }]
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quotes: closedQuotes, fetchedAt: null }))
    )
    render(<StockTickerWidget widgetId="test-stock-7" />)
    await waitFor(() => {
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })
  })

  it('shows no data available when empty quotes returned', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quotes: [], fetchedAt: null }))
    )
    render(<StockTickerWidget widgetId="test-stock-8" />)
    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })
  })

  it('renders in compact mode', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      symbols: ['AAPL'],
      showChange: true,
      showPercent: true,
      compact: true,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ quotes: [mockQuotes[0]], fetchedAt: null }))
    )
    render(<StockTickerWidget widgetId="test-stock-9" />)
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })
  })
})
