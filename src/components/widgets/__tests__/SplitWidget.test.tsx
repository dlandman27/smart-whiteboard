import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    orientation: 'horizontal',
    split: 50,
    paneA: null,
    paneB: null,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

vi.mock('../registry', () => ({
  getWidgetVariant: vi.fn().mockReturnValue(null),
}))

import { SplitWidget } from '../SplitWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('SplitWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<SplitWidget widgetId="test-split-1" />)
  })

  it('shows empty pane placeholders when no panes configured', () => {
    render(<SplitWidget widgetId="test-split-2" />)
    const empties = screen.getAllByText(/empty/i)
    expect(empties.length).toBe(2)
  })

  it('shows widget not found when pane type is invalid', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      orientation: 'horizontal',
      split: 50,
      paneA: { type: 'nonexistent', variantId: 'default' },
      paneB: null,
    }, vi.fn()])
    render(<SplitWidget widgetId="test-split-3" />)
    expect(screen.getByText(/widget not found/i)).toBeInTheDocument()
  })
})
