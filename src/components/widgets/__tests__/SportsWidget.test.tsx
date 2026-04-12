import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    league: 'nfl',
    view: 'scores',
    favoriteTeam: '',
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

const mockUseScores = vi.fn()
const mockUseStandings = vi.fn()
vi.mock('../../../hooks/useSports', () => ({
  useScores:    (...args: any[]) => mockUseScores(...args),
  useStandings: (...args: any[]) => mockUseStandings(...args),
}))

import { NFLWidget } from '../SportsWidget'

describe('SportsWidget (NFLWidget)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStandings.mockReturnValue({ data: null, isLoading: false, error: null })
  })

  it('renders without crashing', () => {
    mockUseScores.mockReturnValue({ data: null, isLoading: true, error: null })
    render(<NFLWidget widgetId="test-nfl-1" />)
  })

  it('shows loading state', () => {
    mockUseScores.mockReturnValue({ data: null, isLoading: true, error: null })
    render(<NFLWidget widgetId="test-nfl-2" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseScores.mockReturnValue({ data: null, isLoading: false, error: new Error('API fail') })
    render(<NFLWidget widgetId="test-nfl-3" />)
    expect(screen.getByText(/failed to load scores/i)).toBeInTheDocument()
  })

  it('shows empty state when no games', () => {
    mockUseScores.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<NFLWidget widgetId="test-nfl-4" />)
    expect(screen.getByText(/no games today/i)).toBeInTheDocument()
  })

  it('shows NFL label', () => {
    mockUseScores.mockReturnValue({ data: null, isLoading: true, error: null })
    render(<NFLWidget widgetId="test-nfl-5" />)
    expect(screen.getByText('NFL')).toBeInTheDocument()
  })
})
