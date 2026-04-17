import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock db.ts so init doesn't actually call Supabase
vi.mock('../lib/db', () => ({
  loadBoards: vi.fn().mockResolvedValue([]),
  loadSchedule: vi.fn().mockResolvedValue(null),
}))

import { useWhiteboardStore, DEFAULT_SETTINGS_ID, DEFAULT_CONNECTORS_ID, DEFAULT_TODAY_ID, DEFAULT_TODO_ID } from './whiteboard'
import { loadBoards, loadSchedule } from '../lib/db'

const mockLoadBoards = loadBoards as ReturnType<typeof vi.fn>

const store = () => useWhiteboardStore.getState()

beforeEach(() => {
  useWhiteboardStore.setState(useWhiteboardStore.getInitialState(), true)
  vi.clearAllMocks()
  mockLoadBoards.mockResolvedValue([])
})

// ─── Initial state ───────────────────────────────────────────────────────────

describe('initial state', () => {
  it('has at least one user board plus system boards', () => {
    const boards = store().boards
    expect(boards.length).toBeGreaterThanOrEqual(6) // Main + Calendar + Settings + Connectors + Today + Todo
  })

  it('has system boards of each type', () => {
    const types = store().boards.map((b) => b.boardType).filter(Boolean)
    expect(types).toContain('calendar')
    expect(types).toContain('settings')
    expect(types).toContain('connectors')
    expect(types).toContain('today')
    expect(types).toContain('todo')
  })

  it('sets activeBoardId to the first board', () => {
    expect(store().activeBoardId).toBe(store().boards[0].id)
  })

  it('starts with isLoading false and no userId', () => {
    expect(store().isLoading).toBe(false)
    expect(store().userId).toBeNull()
  })
})

// ─── init ────────────────────────────────────────────────────────────────────

describe('init', () => {
  it('sets isLoading during load then clears it', async () => {
    mockLoadBoards.mockImplementation(() => new Promise((resolve) => {
      // Check isLoading is true during the load
      expect(store().isLoading).toBe(true)
      resolve([])
    }))

    await store().init('user-123')

    expect(store().isLoading).toBe(false)
  })

  it('sets userId', async () => {
    await store().init('user-123')
    expect(store().userId).toBe('user-123')
  })

  it('loads boards from Supabase and ensures system boards', async () => {
    mockLoadBoards.mockResolvedValue([
      { id: 'b1', name: 'My Board', layoutId: 'dashboard', widgets: [] },
    ])

    await store().init('user-123')

    const boards = store().boards
    expect(boards.find(b => b.id === 'b1')).toBeDefined()
    // System boards should be auto-added
    expect(boards.some(b => b.boardType === 'calendar')).toBe(true)
    expect(boards.some(b => b.boardType === 'settings')).toBe(true)
    expect(boards.some(b => b.boardType === 'todo')).toBe(true)
  })

  it('falls back to defaults on error', async () => {
    mockLoadBoards.mockRejectedValue(new Error('network'))

    await store().init('user-123')

    expect(store().isLoading).toBe(false)
    expect(store().boards.length).toBeGreaterThanOrEqual(6)
  })
})

// ─── addBoard ────────────────────────────────────────────────────────────────

describe('addBoard', () => {
  it('adds a new board and sets it active', () => {
    const before = store().boards.length
    store().addBoard('New Board')
    expect(store().boards.length).toBe(before + 1)
    const added = store().boards[store().boards.length - 1]
    expect(added.name).toBe('New Board')
    expect(store().activeBoardId).toBe(added.id)
  })

  it('uses a preset ID when provided', () => {
    store().addBoard('Custom', 'my-id')
    const added = store().boards.find((b) => b.id === 'my-id')
    expect(added).toBeDefined()
    expect(added!.name).toBe('Custom')
    expect(store().activeBoardId).toBe('my-id')
  })
})

// ─── addCalendarBoard ────────────────────────────────────────────────────────

describe('addCalendarBoard', () => {
  it('adds a calendar board with correct type and calendarId', () => {
    store().addCalendarBoard('Work Calendar')
    const calBoards = store().boards.filter((b) => b.boardType === 'calendar')
    const last = calBoards[calBoards.length - 1]
    expect(last.name).toBe('Work Calendar')
    expect(last.calendarId).toBe('primary')
    expect(store().activeBoardId).toBe(last.id)
  })
})

// ─── removeBoard ─────────────────────────────────────────────────────────────

describe('removeBoard', () => {
  it('removes a board', () => {
    store().addBoard('Temp')
    const id = store().activeBoardId
    const before = store().boards.length
    store().removeBoard(id)
    expect(store().boards.length).toBe(before - 1)
    expect(store().boards.find((b) => b.id === id)).toBeUndefined()
  })

  it('does not remove the last board', () => {
    const nonSystemBoards = store().boards.filter((b) => !b.boardType)
    for (const b of nonSystemBoards.slice(1)) store().removeBoard(b.id)
    while (store().boards.length > 1) {
      store().removeBoard(store().boards[0].id)
    }
    const last = store().boards[0]
    store().removeBoard(last.id)
    expect(store().boards.length).toBe(1)
  })

  it('selects an adjacent board when the active board is removed', () => {
    store().addBoard('A', 'a')
    store().addBoard('B', 'b')
    store().setActiveBoard('a')
    store().removeBoard('a')
    expect(store().activeBoardId).not.toBe('a')
    expect(store().boards.find((b) => b.id === store().activeBoardId)).toBeDefined()
  })
})

// ─── renameBoard ─────────────────────────────────────────────────────────────

describe('renameBoard', () => {
  it('renames a board', () => {
    const id = store().boards[0].id
    store().renameBoard(id, 'Renamed')
    expect(store().boards.find((b) => b.id === id)!.name).toBe('Renamed')
  })
})

// ─── Widget management ───────────────────────────────────────────────────────

const sampleWidget = {
  type: '@whiteboard/clock',
  databaseTitle: 'Clock',
  x: 0,
  y: 0,
  width: 200,
  height: 200,
}

function activeBoard() {
  return store().boards.find((b) => b.id === store().activeBoardId)!
}

describe('addWidget', () => {
  it('adds a widget to the active board', () => {
    store().addWidget(sampleWidget)
    expect(activeBoard().widgets.length).toBe(1)
    expect(activeBoard().widgets[0].type).toBe('@whiteboard/clock')
  })

  it('deduplicates by id', () => {
    const w = { ...sampleWidget, id: 'dup-id' } as any
    store().addWidget(w)
    store().addWidget(w)
    const matches = activeBoard().widgets.filter((w) => w.id === 'dup-id')
    expect(matches.length).toBe(1)
  })
})

describe('updateLayout', () => {
  it('updates widget position and size', () => {
    store().addWidget(sampleWidget)
    const id = activeBoard().widgets[0].id
    store().updateLayout(id, { x: 100, y: 50, width: 300 })
    const w = activeBoard().widgets.find((w) => w.id === id)!
    expect(w.x).toBe(100)
    expect(w.y).toBe(50)
    expect(w.width).toBe(300)
    expect(w.height).toBe(200) // unchanged
  })
})

describe('updateSettings', () => {
  it('merges new settings into existing', () => {
    store().addWidget({ ...sampleWidget, settings: { color: 'red' } })
    const id = activeBoard().widgets[0].id
    store().updateSettings(id, { size: 'large' })
    const w = activeBoard().widgets.find((w) => w.id === id)!
    expect(w.settings).toEqual({ color: 'red', size: 'large' })
  })
})

describe('removeWidget', () => {
  it('removes a widget from the active board', () => {
    store().addWidget(sampleWidget)
    const id = activeBoard().widgets[0].id
    store().removeWidget(id)
    expect(activeBoard().widgets.length).toBe(0)
  })
})

describe('clearWidgets', () => {
  it('clears all widgets from the active board only', () => {
    store().addWidget(sampleWidget)
    store().addBoard('Other')
    store().addWidget(sampleWidget) // widget on "Other" board

    const firstBoardId = store().boards[0].id
    store().setActiveBoard(firstBoardId)
    store().clearWidgets()
    expect(activeBoard().widgets.length).toBe(0)

    const other = store().boards.find((b) => b.name === 'Other')!
    expect(other.widgets.length).toBe(1)
  })
})

describe('assignSlot', () => {
  it('assigns a slot to a widget', () => {
    store().addWidget(sampleWidget)
    const id = activeBoard().widgets[0].id
    store().assignSlot(id, 'slot-1')
    expect(activeBoard().widgets[0].slotId).toBe('slot-1')
  })

  it('clears slot assignment when null', () => {
    store().addWidget(sampleWidget)
    const id = activeBoard().widgets[0].id
    store().assignSlot(id, 'slot-1')
    store().assignSlot(id, null)
    expect(activeBoard().widgets[0].slotId).toBeUndefined()
  })
})

// ─── Board settings ──────────────────────────────────────────────────────────

describe('setLayoutSpacing', () => {
  it('sets gap and pad on a board', () => {
    const id = store().boards[0].id
    store().setLayoutSpacing(id, 12, 8)
    const board = store().boards.find((b) => b.id === id)!
    expect(board.slotGap).toBe(12)
    expect(board.slotPad).toBe(8)
  })
})

describe('reorderBoards', () => {
  it('moves a board from one index to another', () => {
    store().addBoard('A', 'a')
    store().addBoard('B', 'b')
    const ids = store().boards.map((b) => b.id)
    const aIdx = ids.indexOf('a')
    const bIdx = ids.indexOf('b')
    store().reorderBoards(aIdx, bIdx)
    const newIds = store().boards.map((b) => b.id)
    expect(newIds.indexOf('b')).toBeLessThan(newIds.indexOf('a'))
  })
})

describe('setBoardBackground', () => {
  it('sets a background on a board', () => {
    const id = store().boards[0].id
    const bg = { label: 'Test', bg: '#000', dot: '#fff' }
    store().setBoardBackground(id, bg)
    expect(store().boards.find((b) => b.id === id)!.background).toEqual(bg)
  })
})

describe('setBoardWidgetStyle', () => {
  it('sets widget style on a board', () => {
    const id = store().boards[0].id
    store().setBoardWidgetStyle(id, 'glass')
    expect(store().boards.find((b) => b.id === id)!.widgetStyle).toBe('glass')
  })
})

// ─── setLayout ───────────────────────────────────────────────────────────────

describe('setLayout', () => {
  it('changes the layout ID on a board', () => {
    const id = store().boards[0].id
    store().setLayout(id, 'split-h')
    expect(store().boards.find((b) => b.id === id)!.layoutId).toBe('split-h')
  })

  it('applies widget updates when provided', () => {
    store().addWidget(sampleWidget)
    const boardId = store().activeBoardId
    const widgetId = activeBoard().widgets[0].id
    store().setLayout(boardId, 'focus', [
      { id: widgetId, slotId: 'main', x: 0, y: 0, width: 500, height: 500 },
    ])
    const w = activeBoard().widgets.find((w) => w.id === widgetId)!
    expect(w.slotId).toBe('main')
    expect(w.width).toBe(500)
  })
})

describe('setCustomLayout', () => {
  it('sets custom layout with slots', () => {
    const boardId = store().boards[0].id
    const slots = [{ id: 'a', x: 0, y: 0, width: 0.5, height: 1 }]
    store().setCustomLayout(boardId, slots)
    const board = store().boards.find((b) => b.id === boardId)!
    expect(board.layoutId).toBe('custom')
    expect(board.customSlots).toEqual(slots)
  })
})
