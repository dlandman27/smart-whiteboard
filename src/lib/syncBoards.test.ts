import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the db module
vi.mock('./db', () => ({
  upsertBoard:    vi.fn().mockResolvedValue(undefined),
  deleteBoard:    vi.fn().mockResolvedValue(undefined),
  upsertWidget:   vi.fn().mockResolvedValue(undefined),
  deleteWidget:   vi.fn().mockResolvedValue(undefined),
  upsertSchedule: vi.fn().mockResolvedValue(undefined),
}))

// Mock realtimeSync
vi.mock('./realtimeSync', () => ({
  touchId:          vi.fn(),
  markBoardDeleted: vi.fn(),
}))

// Mock whiteboard store
const storeListeners = new Set<(state: any) => void>()
let storeState = {
  boards:      [] as any[],
  schedule:    { enabled: false, slots: [] },
  activeBoardId: 'board-1',
}

vi.mock('../store/whiteboard', () => {
  const mockStore: any = (selector: any) => selector(storeState)
  mockStore.getState = () => storeState
  mockStore.subscribe = (cb: any) => {
    storeListeners.add(cb)
    return () => storeListeners.delete(cb)
  }
  return { useWhiteboardStore: mockStore }
})

import { upsertBoard, deleteBoard, upsertWidget, deleteWidget, upsertSchedule } from './db'
import { touchId, markBoardDeleted } from './realtimeSync'
import { startBoardSync, stopBoardSync, markBoardCreated } from './syncBoards'

function triggerStore(nextState: Partial<typeof storeState>) {
  storeState = { ...storeState, ...nextState }
  storeListeners.forEach((cb) => cb(storeState))
}

describe('startBoardSync / stopBoardSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    storeListeners.clear()
    storeState = { boards: [], schedule: { enabled: false, slots: [] }, activeBoardId: 'board-1' }
    vi.clearAllMocks()
  })

  afterEach(() => {
    stopBoardSync()
    vi.useRealTimers()
  })

  it('starts syncing without throwing', () => {
    expect(() => startBoardSync('user-1')).not.toThrow()
  })

  it('stopBoardSync without prior start does not throw', () => {
    expect(() => stopBoardSync()).not.toThrow()
  })

  it('does not double-subscribe for the same user', () => {
    startBoardSync('user-1')
    const listenerCount = storeListeners.size
    startBoardSync('user-1')
    expect(storeListeners.size).toBe(listenerCount)
  })

  it('calls deleteBoard when a board is removed', () => {
    const board = { id: 'b1', name: 'Test', layoutId: 'dashboard', boardType: undefined, widgets: [] }
    storeState = { ...storeState, boards: [board] }
    startBoardSync('user-1')

    // Remove the board
    triggerStore({ boards: [] })

    expect(markBoardDeleted).toHaveBeenCalledWith('b1')
    expect(deleteBoard).toHaveBeenCalledWith('b1')
  })

  it('upserts a newly created board when markBoardCreated was called', () => {
    const board = { id: 'new-b', name: 'New Board', layoutId: 'dashboard', boardType: undefined, widgets: [] }
    markBoardCreated('new-b')
    startBoardSync('user-1')

    triggerStore({ boards: [board] })

    expect(upsertBoard).toHaveBeenCalledWith(board, 'user-1', 0)
  })

  it('does not upsert boards that were not created this session', () => {
    vi.clearAllMocks()
    const board = { id: 'foreign-board', name: 'Foreign', layoutId: 'dashboard', boardType: undefined, widgets: [] }
    startBoardSync('user-2')

    triggerStore({ boards: [board] })

    expect(upsertBoard).not.toHaveBeenCalledWith(board, 'user-2', 0)
  })

  it('does not upsert system boards (boardType set)', () => {
    vi.clearAllMocks()
    const board = { id: 'sys-1', name: 'Settings', layoutId: 'dashboard', boardType: 'settings', widgets: [] }
    startBoardSync('user-1')

    triggerStore({ boards: [board] })

    // System boards should not be upserted via the "added" path
    expect(upsertBoard).not.toHaveBeenCalled()
  })

  it('debounces upsertSchedule when schedule changes', () => {
    startBoardSync('user-1')
    triggerStore({ schedule: { enabled: true, slots: [] } })

    // Should not be called immediately
    expect(upsertSchedule).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(upsertSchedule).toHaveBeenCalledWith('user-1', { enabled: true, slots: [] })
  })

  it('calls deleteWidget when a widget is removed from a board', () => {
    const widget = { id: 'w1', type: 'clock', x: 0, y: 0, width: 100, height: 100, settings: {} }
    const board = { id: 'b1', name: 'Main', layoutId: 'dashboard', boardType: undefined, widgets: [widget] }
    markBoardCreated('b1')
    storeState = { ...storeState, boards: [board] }
    startBoardSync('user-1')

    triggerStore({ boards: [{ ...board, widgets: [] }] })

    expect(deleteWidget).toHaveBeenCalledWith('w1')
  })

  it('upserts widget immediately on non-position change', () => {
    const widget = { id: 'w2', type: 'clock', x: 0, y: 0, width: 100, height: 100, settings: { title: 'A' } }
    const board  = { id: 'b2', name: 'B', layoutId: 'dashboard', boardType: undefined, widgets: [widget] }
    markBoardCreated('b2')
    storeState = { ...storeState, boards: [board] }
    startBoardSync('user-1')

    const updated = { ...widget, settings: { title: 'B' } }
    triggerStore({ boards: [{ ...board, widgets: [updated] }] })

    expect(upsertWidget).toHaveBeenCalledWith(updated, 'b2', 'user-1')
  })
})

describe('markBoardCreated', () => {
  it('can be called without throwing', () => {
    expect(() => markBoardCreated('some-id')).not.toThrow()
  })
})
