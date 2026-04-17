import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the whiteboard store
vi.mock('../store/whiteboard', () => {
  const listeners = new Set<(state: any, prev: any) => void>()
  let currentState = {
    boards: [
      { id: 'board-uuid-1', name: 'Main', boardType: undefined },
      { id: 'cal-uuid',     name: 'Calendar', boardType: 'calendar' },
    ],
    activeBoardId: 'board-uuid-1',
    isLoading: false,
    setActiveBoardManual: vi.fn(),
  }

  const mockStore: any = (selector: any) => selector(currentState)
  mockStore.getState = () => currentState
  mockStore.subscribe = vi.fn((cb: any) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  })
  mockStore._setState = (next: any) => {
    const prev = currentState
    currentState = { ...currentState, ...next }
    listeners.forEach((l) => l(currentState, prev))
  }

  return { useWhiteboardStore: mockStore }
})

import { useWhiteboardStore } from '../store/whiteboard'
import { useHashRouter, useHashFragment, navigateHash } from './useHashRouter'

describe('navigateHash', () => {
  it('sets window.location.hash and dispatches popstate', () => {
    const spy = vi.spyOn(window, 'dispatchEvent')
    navigateHash('settings')
    expect(window.location.hash).toBe('#/settings')
    const calls = spy.mock.calls.map(([e]) => e)
    expect(calls.some((e) => e.type === 'popstate')).toBe(true)
    spy.mockRestore()
  })

  it('builds hash with fragment when provided', () => {
    navigateHash('connectors', 'tasks')
    expect(window.location.hash).toBe('#/connectors/tasks')
  })
})

describe('useHashRouter', () => {
  beforeEach(() => {
    // Reset hash
    history.replaceState(null, '', '#')
    ;(useWhiteboardStore as any)._setState({
      activeBoardId: 'board-uuid-1',
      isLoading: false,
    })
    ;(useWhiteboardStore.getState().setActiveBoardManual as any).mockClear()
  })

  it('mounts without errors', () => {
    expect(() => renderHook(() => useHashRouter())).not.toThrow()
  })

  it('navigates to the board from hash on popstate', () => {
    renderHook(() => useHashRouter())
    // Navigate to calendar (system board with boardType slug)
    history.replaceState(null, '', '#/calendar')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(useWhiteboardStore.getState().setActiveBoardManual).toHaveBeenCalledWith('cal-uuid')
  })

  it('does not navigate if hash resolves to current board', () => {
    history.replaceState(null, '', '#/board/board-uuid-1')
    renderHook(() => useHashRouter())
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    // setActiveBoardManual should not be called since it's already the active board
    expect(useWhiteboardStore.getState().setActiveBoardManual).not.toHaveBeenCalledWith('board-uuid-1')
  })

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useHashRouter())
    unmount()
    const removed = removeSpy.mock.calls.map(([e]) => e)
    expect(removed).toContain('popstate')
    removeSpy.mockRestore()
  })
})

describe('useHashFragment', () => {
  it('returns null initially', () => {
    const { result } = renderHook(() => useHashFragment())
    expect(result.current).toBeNull()
  })

  it('clears the fragment after reading', async () => {
    // navigate to set a fragment
    navigateHash('connectors', 'tasks')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    const { result } = renderHook(() => useHashFragment())
    // After effect runs, fragment should be cleared
    await act(async () => {})
    expect(result.current).toBeNull()
  })
})
