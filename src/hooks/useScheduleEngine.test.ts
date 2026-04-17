import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('../store/whiteboard', () => {
  let state = {
    schedule: { enabled: false, slots: [] },
    boards: [],
    activeBoardId: 'board-1',
    lastManualSwitch: 0,
    setActiveBoard: vi.fn(),
  }
  const mockStore: any = (selector: any) => selector(state)
  mockStore.getState = () => state
  mockStore._setState = (next: any) => { state = { ...state, ...next } }
  return { useWhiteboardStore: mockStore }
})

vi.mock('../constants/schedulePresets', async (importOriginal) => {
  const real = await importOriginal<typeof import('../constants/schedulePresets')>()
  return { ...real, findActiveSlot: vi.fn() }
})

import { useWhiteboardStore } from '../store/whiteboard'
import { findActiveSlot } from '../constants/schedulePresets'
import { useScheduleEngine } from './useScheduleEngine'

const MANUAL_OVERRIDE_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MS  = 60 * 1000

describe('useScheduleEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: false, slots: [] },
      boards: [{ id: 'board-2' }],
      activeBoardId: 'board-1',
      lastManualSwitch: 0,
    })
    ;(useWhiteboardStore.getState().setActiveBoard as any).mockClear()
    ;(findActiveSlot as any).mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does nothing when scheduling is disabled', () => {
    renderHook(() => useScheduleEngine())
    vi.advanceTimersByTime(CHECK_INTERVAL_MS * 3)
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()
  })

  it('does nothing when no active slot is found', () => {
    ;(useWhiteboardStore as any)._setState({ schedule: { enabled: true, slots: [] } })
    ;(findActiveSlot as any).mockReturnValue(null)
    renderHook(() => useScheduleEngine())
    vi.advanceTimersByTime(CHECK_INTERVAL_MS)
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()
  })

  it('switches board when schedule is enabled and slot matches', () => {
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: true, slots: [{ id: 's1', boardId: 'board-2', startTime: '08:00', endTime: '10:00', days: [] }] },
    })
    ;(findActiveSlot as any).mockReturnValue({ boardId: 'board-2' })

    renderHook(() => useScheduleEngine())
    // The check runs immediately on mount
    expect(useWhiteboardStore.getState().setActiveBoard).toHaveBeenCalledWith('board-2')
  })

  it('respects manual override within 5 minutes', () => {
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: true, slots: [{ id: 's1', boardId: 'board-2', startTime: '08:00', endTime: '10:00', days: [] }] },
      lastManualSwitch: Date.now() - (MANUAL_OVERRIDE_MS - 10_000), // 10s ago (still within override window)
    })
    ;(findActiveSlot as any).mockReturnValue({ boardId: 'board-2' })

    renderHook(() => useScheduleEngine())
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()
  })

  it('does not switch if target board does not exist', () => {
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: true, slots: [] },
      boards: [], // empty boards
    })
    ;(findActiveSlot as any).mockReturnValue({ boardId: 'board-nonexistent' })
    renderHook(() => useScheduleEngine())
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()
  })

  it('does not switch a second time to same board', () => {
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: true, slots: [] },
      boards: [{ id: 'board-2' }],
      activeBoardId: 'board-2',
    })
    ;(findActiveSlot as any).mockReturnValue({ boardId: 'board-2' })

    renderHook(() => useScheduleEngine())
    // First call switches and records lastSwitchedBoardRef
    ;(useWhiteboardStore.getState().setActiveBoard as any).mockClear()

    vi.advanceTimersByTime(CHECK_INTERVAL_MS)
    // Already switched to board-2 and it's still board-2 — skip
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()
  })

  it('cleans up interval on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = renderHook(() => useScheduleEngine())
    unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('re-checks every CHECK_INTERVAL_MS', () => {
    ;(useWhiteboardStore as any)._setState({
      schedule: { enabled: true, slots: [{ id: 's1', boardId: 'board-2', startTime: '08:00', endTime: '10:00', days: [] }] },
      activeBoardId: 'board-1',
    })
    ;(findActiveSlot as any).mockReturnValueOnce(null).mockReturnValue({ boardId: 'board-2' })

    renderHook(() => useScheduleEngine())
    expect(useWhiteboardStore.getState().setActiveBoard).not.toHaveBeenCalled()

    vi.advanceTimersByTime(CHECK_INTERVAL_MS)
    expect(useWhiteboardStore.getState().setActiveBoard).toHaveBeenCalledWith('board-2')
  })
})
