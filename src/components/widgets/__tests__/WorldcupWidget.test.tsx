import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { WorldcupWidget } from '../WorldcupWidget'

describe('WorldcupWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events: [] }))
    )
    render(<WorldcupWidget widgetId="test-wc-1" />)
  })

  it('shows loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<WorldcupWidget widgetId="test-wc-2" />)
    expect(screen.getByText(/loading fixtures/i)).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    render(<WorldcupWidget widgetId="test-wc-3" />)
    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no upcoming fixtures', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events: [] }))
    )
    render(<WorldcupWidget widgetId="test-wc-4" />)
    await waitFor(() => {
      expect(screen.getByText(/no upcoming fixtures/i)).toBeInTheDocument()
    })
  })

  it('shows header with World Cup 2026', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<WorldcupWidget widgetId="test-wc-5" />)
    expect(screen.getByText(/world cup 2026/i)).toBeInTheDocument()
  })
})
