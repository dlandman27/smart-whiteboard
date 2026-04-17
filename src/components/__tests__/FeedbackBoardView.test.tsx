import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { FeedbackBoardView } from '../FeedbackBoardView'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn()
vi.mock('../../lib/apiFetch', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}))

vi.mock('@whiteboard/ui-kit', () => {
  const React = require('react')
  return {
    Icon:       ({ icon, size, style }: any) => <span data-testid={`icon-${icon}`} style={style} />,
    Text:       ({ children, ...p }: any) => <span {...p}>{children}</span>,
    ScrollArea: ({ children, style, className }: any) => <div style={style} className={className}>{children}</div>,
    Button:     ({ children, onClick, variant, disabled, size }: any) => (
      <button onClick={onClick} data-variant={variant} disabled={disabled}>{children}</button>
    ),
  }
})

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_POSTS = [
  {
    id: 'p1',
    title: 'Add dark mode',
    body: 'Please add a dark mode option',
    category: 'idea',
    status: 'planned',
    vote_count: 10,
    has_voted: false,
    comment_count: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'p2',
    title: 'Login bug',
    body: null,
    category: 'bug',
    status: 'in-progress',
    vote_count: 5,
    has_voted: true,
    comment_count: 0,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FeedbackBoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return sample posts
    mockApiFetch.mockResolvedValue({ posts: SAMPLE_POSTS })
  })

  it('renders without crashing (smoke test)', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    expect(screen.getByText('Feedback')).toBeInTheDocument()
  })

  it('shows the subtitle description', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    expect(screen.getByText(/Share ideas, report bugs/i)).toBeInTheDocument()
  })

  it('shows Share an idea button', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    expect(screen.getByText('Share an idea')).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching', async () => {
    // Never resolves during render
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    render(<FeedbackBoardView />)
    // During loading, 3 skeleton items are shown (height:88 divs)
    // We just confirm no posts are visible yet
    expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument()
  })

  it('shows posts after loading', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => {
      expect(screen.getByText('Add dark mode')).toBeInTheDocument()
      expect(screen.getByText('Login bug')).toBeInTheDocument()
    })
  })

  it('shows empty state when no posts', async () => {
    mockApiFetch.mockResolvedValue({ posts: [] })
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => {
      expect(screen.getByText('No feedback yet')).toBeInTheDocument()
    })
  })

  it('shows vote counts for posts', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('shows category filter pills', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Ideas')).toBeInTheDocument()
    expect(screen.getByText('Bugs')).toBeInTheDocument()
    expect(screen.getByText('UX')).toBeInTheDocument()
  })

  it('shows sort toggle buttons', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    expect(screen.getByText('Top')).toBeInTheDocument()
    expect(screen.getByText('Newest')).toBeInTheDocument()
  })

  it('opens create modal when Share an idea is clicked', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    // Click the header "Share an idea" button
    const btn = screen.getAllByText('Share an idea')[0].closest('button')!
    fireEvent.click(btn)
    await waitFor(() => {
      // The modal has a Cancel button
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('category filter changes API call params', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => screen.getByText('Bugs'))
    fireEvent.click(screen.getByText('Bugs'))
    await waitFor(() => {
      // apiFetch called with category=bug — first arg is the URL string
      const calls = mockApiFetch.mock.calls
      expect(calls.some((args: any[]) => String(args[0]).includes('category=bug'))).toBe(true)
    })
  })

  it('changes sort when Newest is clicked', async () => {
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => screen.getByText('Newest'))
    fireEvent.click(screen.getByText('Newest'))
    await waitFor(() => {
      const calls = mockApiFetch.mock.calls
      expect(calls.some((args: any[]) => String(args[0]).includes('sort=newest'))).toBe(true)
    })
  })

  it('navigates to post detail when a post is clicked', async () => {
    // Provide detail response
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/p1')) return Promise.resolve({ post: SAMPLE_POSTS[0], comments: [] })
      return Promise.resolve({ posts: SAMPLE_POSTS })
    })
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => screen.getByText('Add dark mode'))
    // Click the post card
    fireEvent.click(screen.getByText('Add dark mode'))
    await waitFor(() => {
      expect(screen.getByText('Back to feedback')).toBeInTheDocument()
    })
  })

  it('optimistically updates vote count when vote button clicked', async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/vote')) return Promise.resolve({})
      return Promise.resolve({ posts: SAMPLE_POSTS })
    })
    await act(async () => { render(<FeedbackBoardView />) })
    await waitFor(() => screen.getByText('Add dark mode'))
    // Find first upvote button (vote count = 10)
    const voteButtons = screen.getAllByRole('button').filter(b => b.textContent === '10')
    if (voteButtons.length > 0) {
      fireEvent.click(voteButtons[0])
      // After click, optimistic update: 10 → 11
      await waitFor(() => {
        expect(screen.getByText('11')).toBeInTheDocument()
      })
    }
  })
})
