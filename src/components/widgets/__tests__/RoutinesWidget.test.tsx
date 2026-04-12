import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    databaseId: '',
    morningEnd: 12,
    eveningStart: 18,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { RoutinesWidget } from '../RoutinesWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('RoutinesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<RoutinesWidget widgetId="test-routines-1" />)
  })

  it('shows empty state when no database configured', () => {
    render(<RoutinesWidget widgetId="test-routines-2" />)
    expect(screen.getByText(/no database/i)).toBeInTheDocument()
  })

  it('shows loading state when fetching routines', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      databaseId: 'db-123',
      morningEnd: 12,
      eveningStart: 18,
    }, vi.fn()])
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<RoutinesWidget widgetId="test-routines-3" />)
    // The loading text appears after the header renders
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('shows routines when data loads', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      databaseId: 'db-123',
      morningEnd: 12,
      eveningStart: 18,
    }, vi.fn()])
    const hour = new Date().getHours()
    const currentPeriod = hour < 12 ? 'Morning' : hour < 18 ? 'Fitness' : 'Evening'
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        results: [{
          id: 'r1',
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'Meditate' }] },
            Category: { type: 'select', select: { name: currentPeriod } },
            Done: { type: 'checkbox', checkbox: false },
          },
        }],
      }))
    )
    render(<RoutinesWidget widgetId="test-routines-4" />)
    await waitFor(() => {
      expect(screen.getByText('Meditate')).toBeInTheDocument()
    })
  })
})
