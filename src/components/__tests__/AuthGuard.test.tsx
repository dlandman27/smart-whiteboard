import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// supabase is globally mocked in setup.ts

const mockInit = vi.fn().mockResolvedValue(undefined)
const mockInitTheme = vi.fn().mockResolvedValue(undefined)

vi.mock('../../store/whiteboard', () => ({
  useWhiteboardStore: vi.fn((selector?: any) => {
    const state = {
      boards: [],
      activeBoardId: 'b1',
      userId: null,
      isLoading: false,
      init: mockInit,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  }),
}))

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn((selector: any) =>
    selector({
      init: mockInitTheme,
      background: { type: 'color', bg: '#000' },
    })
  ),
}))

vi.mock('../../lib/syncBoards', () => ({
  startBoardSync: vi.fn(),
  stopBoardSync: vi.fn(),
  markBoardCreated: vi.fn(),
}))

vi.mock('../../lib/syncTheme', () => ({
  startThemeSync: vi.fn(),
  stopThemeSync: vi.fn(),
}))

vi.mock('../../lib/realtimeSync', () => ({
  startRealtimeSync: vi.fn(),
  stopRealtimeSync: vi.fn(),
}))

vi.mock('../../lib/analytics', () => ({
  analytics: {
    identify: vi.fn(),
    track: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('../LoginScreen', () => ({
  LoginScreen: () => <div data-testid="login-screen">Login</div>,
}))

vi.mock('../TemplatePicker', () => ({
  TemplatePicker: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="template-picker">
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}))

import { AuthGuard } from '../AuthGuard'
import { supabase } from '../../lib/supabase'

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows loading skeleton while session is undefined (initial state)', () => {
    // getSession is async — before it resolves, session is undefined
    vi.mocked(supabase.auth.getSession).mockReturnValue(new Promise(() => {}))
    const { container } = render(
      <AuthGuard>
        <div data-testid="child">App Content</div>
      </AuthGuard>
    )
    // Loading skeleton has specific structure — no "App Content" visible
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    // The skeleton renders some divs
    expect(container.firstChild).toBeTruthy()
  })

  it('shows LoginScreen when session is null', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any)
    render(
      <AuthGuard>
        <div data-testid="child">App Content</div>
      </AuthGuard>
    )
    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('shows children when user is authenticated and not loading', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@test.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fakeSession } } as any)

    const { useWhiteboardStore } = await import('../../store/whiteboard')
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [{ id: 'b1', name: 'Main', widgets: [], boardType: undefined }],
        activeBoardId: 'b1',
        userId: 'user-1',
        isLoading: false,
        init: mockInit,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    // Mark onboarding complete so TemplatePicker doesn't show
    localStorage.setItem('onboarding-complete', '1')

    render(
      <AuthGuard>
        <div data-testid="child">App Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  it('shows loading skeleton when isLoading is true even with session', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@test.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fakeSession } } as any)

    const { useWhiteboardStore } = await import('../../store/whiteboard')
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [],
        activeBoardId: 'b1',
        userId: 'user-1',
        isLoading: true,
        init: mockInit,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    render(
      <AuthGuard>
        <div data-testid="child">App Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      // Still in loading state — no child rendered
      expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    })
  })

  it('shows TemplatePicker on first run after loading', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'test@test.com' } }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fakeSession } } as any)

    const { useWhiteboardStore } = await import('../../store/whiteboard')
    vi.mocked(useWhiteboardStore).mockImplementation((selector?: any) => {
      const state = {
        boards: [],
        activeBoardId: 'b1',
        userId: 'user-1',
        isLoading: false,
        init: mockInit,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    // Don't set 'onboarding-complete' — simulates first run
    render(
      <AuthGuard>
        <div data-testid="child">App Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByTestId('template-picker')).toBeInTheDocument()
    })
  })
})
