import { describe, it, expect, vi, beforeEach } from 'vitest'

// supabase is globally mocked in src/test/setup.ts
// useWhiteboardStore needs to be mocked so we can verify setState calls
vi.mock('../store/whiteboard', () => ({
  useWhiteboardStore: {
    getState: vi.fn(() => ({
      boards: [],
      activeBoardId: 'board-1',
    })),
    setState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}))

import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { startRealtimeSync, stopRealtimeSync, touchId, markBoardDeleted } from './realtimeSync'

const mockSupabase = supabase as any

describe('realtimeSync', () => {
  let mockChannel: any
  let mockOn: ReturnType<typeof vi.fn>
  let mockSubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOn = vi.fn().mockReturnThis()
    mockSubscribe = vi.fn().mockReturnThis()
    mockChannel = { on: mockOn, subscribe: mockSubscribe }
    mockSupabase.channel.mockReturnValue(mockChannel)
  })

  describe('startRealtimeSync()', () => {
    it('calls supabase.channel() with "board-sync"', () => {
      startRealtimeSync('user-1')
      expect(mockSupabase.channel).toHaveBeenCalledWith('board-sync')
    })

    it('subscribes to postgres_changes on widgets table', () => {
      startRealtimeSync('user-1')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'widgets', filter: 'user_id=eq.user-1' }),
        expect.any(Function)
      )
    })

    it('calls subscribe()', () => {
      startRealtimeSync('user-1')
      expect(mockSubscribe).toHaveBeenCalled()
    })
  })

  describe('stopRealtimeSync()', () => {
    it('calls supabase.removeChannel when channel exists', () => {
      startRealtimeSync('user-1')
      stopRealtimeSync()
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })

    it('does not throw when called without starting', () => {
      expect(() => stopRealtimeSync()).not.toThrow()
    })

    it('sets channel to null so a second stop is a no-op', () => {
      startRealtimeSync('user-1')
      stopRealtimeSync()
      vi.clearAllMocks()
      stopRealtimeSync()
      expect(mockSupabase.removeChannel).not.toHaveBeenCalled()
    })
  })

  describe('startRealtimeSync() — replaces existing channel', () => {
    it('stops previous channel before creating a new one', () => {
      startRealtimeSync('user-1')
      const firstChannel = mockChannel
      // Second call should removeChannel the first
      startRealtimeSync('user-2')
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(firstChannel)
    })
  })

  describe('touchId() helper', () => {
    it('can be called without error', () => {
      expect(() => touchId('some-id')).not.toThrow()
    })
  })

  describe('markBoardDeleted() helper', () => {
    it('can be called without error', () => {
      expect(() => markBoardDeleted('board-1')).not.toThrow()
    })
  })

  describe('widget change handler — INSERT', () => {
    it('dispatches setState on INSERT event', () => {
      startRealtimeSync('user-1')
      // Get the callback registered for postgres_changes
      const callback = mockOn.mock.calls[0][2]

      const storeState = {
        boards: [{ id: 'board-1', widgets: [] }],
        activeBoardId: 'board-1',
      }
      vi.mocked(useWhiteboardStore.getState).mockReturnValue(storeState as any)

      callback({
        eventType: 'INSERT',
        new: { id: 'w-1', board_id: 'board-1', type: 'clock', x: 0, y: 0, width: 200, height: 100, settings: {} },
        old: {},
      })

      expect(useWhiteboardStore.setState).toHaveBeenCalled()
    })

    it('skips INSERT for recently-touched widget ids', () => {
      startRealtimeSync('user-1')
      const callback = mockOn.mock.calls[0][2]

      touchId('w-recently-touched')
      vi.mocked(useWhiteboardStore.setState).mockClear()

      callback({
        eventType: 'INSERT',
        new: { id: 'w-recently-touched', board_id: 'board-1', type: 'clock', x: 0, y: 0, width: 200, height: 100, settings: {} },
        old: {},
      })

      expect(useWhiteboardStore.setState).not.toHaveBeenCalled()
    })
  })

  describe('widget change handler — DELETE', () => {
    it('dispatches setState on DELETE event', () => {
      startRealtimeSync('user-1')
      const callback = mockOn.mock.calls[0][2]
      vi.mocked(useWhiteboardStore.setState).mockClear()

      callback({
        eventType: 'DELETE',
        new: {},
        old: { id: 'w-99' },
      })

      expect(useWhiteboardStore.setState).toHaveBeenCalled()
    })
  })

  describe('widget change handler — UPDATE', () => {
    it('dispatches setState on UPDATE event', () => {
      startRealtimeSync('user-1')
      const callback = mockOn.mock.calls[0][2]
      vi.mocked(useWhiteboardStore.setState).mockClear()

      callback({
        eventType: 'UPDATE',
        new: { id: 'w-1', board_id: 'board-1', type: 'clock', x: 10, y: 20, width: 200, height: 100, settings: {} },
        old: { id: 'w-1' },
      })

      expect(useWhiteboardStore.setState).toHaveBeenCalled()
    })
  })
})
