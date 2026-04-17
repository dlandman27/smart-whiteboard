import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from './useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  it('returns true when navigator.onLine is true', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)
  })

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(false)
  })

  it('updates to false when offline event fires', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('updates to true when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })

  it('removes event listeners on unmount', () => {
    const addSpy    = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus())
    unmount()

    // Should have removed the two listeners it added
    const addedOnline  = addSpy.mock.calls.filter(([e]) => e === 'online')
    const removedOnline = removeSpy.mock.calls.filter(([e]) => e === 'online')
    expect(removedOnline.length).toBeGreaterThanOrEqual(addedOnline.length)

    vi.restoreAllMocks()
  })
})
