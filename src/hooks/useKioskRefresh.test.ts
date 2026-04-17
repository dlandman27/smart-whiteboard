import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKioskRefresh } from './useKioskRefresh'

const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000

// jsdom doesn't allow spying on location.reload directly — replace the whole location
const mockReload = vi.fn()

describe('useKioskRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Replace window.location with a writable object
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...window.location, reload: mockReload },
    })
    mockReload.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not reload before 24 hours', () => {
    renderHook(() => useKioskRefresh())
    vi.advanceTimersByTime(REFRESH_AFTER_MS - 1)
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('calls location.reload after 24 hours', () => {
    renderHook(() => useKioskRefresh())
    vi.advanceTimersByTime(REFRESH_AFTER_MS)
    expect(mockReload).toHaveBeenCalledTimes(1)
  })

  it('clears the timer on unmount (reload not called after unmount)', () => {
    const { unmount } = renderHook(() => useKioskRefresh())
    unmount()
    vi.advanceTimersByTime(REFRESH_AFTER_MS)
    expect(mockReload).not.toHaveBeenCalled()
  })
})
