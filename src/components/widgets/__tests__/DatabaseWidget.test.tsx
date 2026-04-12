import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{ databaseId: '' }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

const mockUseNotionPages = vi.fn()
const mockUseUpdatePage = vi.fn()
const mockUseCreatePage = vi.fn()
const mockUseArchivePage = vi.fn()
vi.mock('../../../hooks/useNotion', () => ({
  useNotionPages: (...args: any[]) => mockUseNotionPages(...args),
  useUpdatePage:  (...args: any[]) => mockUseUpdatePage(...args),
  useCreatePage:  (...args: any[]) => mockUseCreatePage(...args),
  useArchivePage: (...args: any[]) => mockUseArchivePage(...args),
}))

import { DatabaseWidget } from '../DatabaseWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

describe('DatabaseWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdatePage.mockReturnValue({ mutate: vi.fn() })
    mockUseCreatePage.mockReturnValue({ mutate: vi.fn() })
    mockUseArchivePage.mockReturnValue({ mutate: vi.fn() })
  })

  it('renders without crashing', () => {
    mockUseNotionPages.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn(), isFetching: false })
    render(<DatabaseWidget widgetId="test-db-1" />)
  })

  it('shows loading state', () => {
    mockUseNotionPages.mockReturnValue({ data: null, isLoading: true, error: null, refetch: vi.fn(), isFetching: false })
    render(<DatabaseWidget widgetId="test-db-2" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseNotionPages.mockReturnValue({ data: null, isLoading: false, error: new Error('Unauthorized'), refetch: vi.fn(), isFetching: false })
    render(<DatabaseWidget widgetId="test-db-3" />)
    expect(screen.getByText(/failed to load entries/i)).toBeInTheDocument()
  })

  it('shows empty state when no pages', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ databaseId: 'db-123' }, vi.fn()])
    mockUseNotionPages.mockReturnValue({ data: { results: [] }, isLoading: false, error: null, refetch: vi.fn(), isFetching: false })
    render(<DatabaseWidget widgetId="test-db-4" />)
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument()
  })

  it('shows data when pages are available', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ databaseId: 'db-123' }, vi.fn()])
    mockUseNotionPages.mockReturnValue({
      data: {
        results: [{
          id: 'page-1',
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'Buy groceries' }] },
            Status: { type: 'status', status: { name: 'In Progress', color: 'blue' } },
          },
        }],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })
    render(<DatabaseWidget widgetId="test-db-5" />)
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })
})
