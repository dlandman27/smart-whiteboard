import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    content: '',
    fontSize: 24,
    align: 'left',
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { NoteWidget } from '../NoteWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('NoteWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<NoteWidget widgetId="test-note-1" />)
  })

  it('shows placeholder when content is empty', () => {
    render(<NoteWidget widgetId="test-note-2" />)
    expect(screen.getByText(/double-click to edit/i)).toBeInTheDocument()
  })

  it('shows content when populated', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      content: 'My important note',
      fontSize: 24,
      align: 'left',
    }, vi.fn()])
    render(<NoteWidget widgetId="test-note-3" />)
    expect(screen.getByText('My important note')).toBeInTheDocument()
  })
})
