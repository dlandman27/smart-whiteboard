import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../ws.js', () => ({
  broadcast: vi.fn(),
  getActiveBoardId: vi.fn(() => ''),
}))

vi.mock('./memory.js', () => ({
  loadMemory: vi.fn(() => ({
    name: '',
    location: '',
    preferences: [],
    facts: [],
    databases: {},
  })),
  saveMemory: vi.fn(),
}))

vi.mock('../lib/logger.js', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock supabaseAdmin — board query returns empty by default; override per-test via mockBoardRows
const mockBoardRows: any[] = []

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'boards') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => Promise.resolve({ data: mockBoardRows, error: null })),
          }),
        }
      }
      // widgets table — used by canvas.createWidget upsert and canvas.updateWidget update
      return {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }
    }),
  },
}))

import { canvas, getBoardSnapshot, autoSaveDatabases, ordinal, leagueLabel } from './board-utils.js'
import * as ws from '../ws.js'
import * as memory from './memory.js'

const mockBroadcast  = ws.broadcast    as ReturnType<typeof vi.fn>
const mockLoadMemory = memory.loadMemory as ReturnType<typeof vi.fn>
const mockSaveMemory = memory.saveMemory as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockBoardRows.length = 0
  mockLoadMemory.mockReturnValue({ name: '', location: '', preferences: [], facts: [], databases: {} })
})

// ── canvas object ────────────────────────────────────────────────────────────

describe('canvas.createWidget', () => {
  it('broadcasts create_widget with a generated id', () => {
    const result = canvas.createWidget({ x: 10, y: 20, widgetType: 'sticky' })
    expect(result.id).toBeDefined()
    expect(mockBroadcast).toHaveBeenCalledOnce()
    const msg = mockBroadcast.mock.calls[0][0]
    expect(msg.type).toBe('create_widget')
    expect(msg.id).toBe(result.id)
    expect(msg.x).toBe(10)
  })

  it('generates a unique id each time', () => {
    const r1 = canvas.createWidget({ widgetType: 'sticky' })
    const r2 = canvas.createWidget({ widgetType: 'sticky' })
    expect(r1.id).not.toBe(r2.id)
  })
})

describe('canvas.updateWidget', () => {
  it('broadcasts update_widget with id and body', async () => {
    await canvas.updateWidget('w1', { title: 'new title' })
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'update_widget', id: 'w1', title: 'new title' })
  })
})

describe('canvas.deleteWidget', () => {
  it('broadcasts delete_widget', () => {
    canvas.deleteWidget('w1')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'delete_widget', id: 'w1' })
  })
})

describe('canvas.focusWidget', () => {
  it('broadcasts focus_widget when id is provided', () => {
    canvas.focusWidget('w1')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'focus_widget', id: 'w1' })
  })

  it('broadcasts unfocus_widget when no id is provided', () => {
    canvas.focusWidget()
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'unfocus_widget' })
  })
})

describe('canvas.setTheme', () => {
  it('broadcasts set_theme', () => {
    canvas.setTheme('dark')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'set_theme', themeId: 'dark' })
  })
})

describe('canvas.createBoard', () => {
  it('broadcasts create_board with name and returns generated id', () => {
    const result = canvas.createBoard('My Board')
    expect(result.id).toBeDefined()
    const msg = mockBroadcast.mock.calls[0][0]
    expect(msg.type).toBe('create_board')
    expect(msg.name).toBe('My Board')
    expect(msg.id).toBe(result.id)
  })
})

describe('canvas.activateBoard', () => {
  it('broadcasts switch_board', () => {
    canvas.activateBoard('b1')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'switch_board', id: 'b1' })
  })
})

describe('canvas.renameBoard', () => {
  it('broadcasts rename_board', () => {
    canvas.renameBoard('b1', 'New Name')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'rename_board', id: 'b1', name: 'New Name' })
  })
})

describe('canvas.deleteBoard', () => {
  it('broadcasts delete_board', () => {
    canvas.deleteBoard('b1')
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'delete_board', id: 'b1' })
  })
})

// ── autoSaveDatabases ────────────────────────────────────────────────────────

describe('autoSaveDatabases', () => {
  it('does nothing when no boards', async () => {
    mockBoardRows.length = 0
    await autoSaveDatabases('user-1')
    expect(mockSaveMemory).not.toHaveBeenCalled()
  })

  it('saves new database ids found in widgets', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'Board 1',
      widgets: [
        { id: 'w1', type: 'list', settings: { databaseId: 'db-abc', title: 'My Tasks' }, database_title: null },
      ],
    })
    await autoSaveDatabases('user-1')
    expect(mockSaveMemory).toHaveBeenCalledOnce()
    const savedMem = mockSaveMemory.mock.calls[0][0]
    expect(savedMem.databases['My Tasks']).toBe('db-abc')
  })

  it('does not duplicate already-known database ids', async () => {
    mockLoadMemory.mockReturnValue({
      name: '', location: '', preferences: [], facts: [],
      databases: { 'My Tasks': 'db-abc' },
    })
    mockBoardRows.push({
      id: 'b1', name: 'Board 1',
      widgets: [
        { id: 'w1', type: 'list', settings: { databaseId: 'db-abc', title: 'My Tasks' }, database_title: null },
      ],
    })
    await autoSaveDatabases('user-1')
    expect(mockSaveMemory).not.toHaveBeenCalled()
  })

  it('uses widget type as fallback label when no title', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'Board 1',
      widgets: [{ id: 'w1', type: 'calendar', settings: { databaseId: 'db-xyz' }, database_title: null }],
    })
    await autoSaveDatabases('user-1')
    const savedMem = mockSaveMemory.mock.calls[0][0]
    expect(savedMem.databases['calendar']).toBe('db-xyz')
  })

  it('uses databaseTitle label when present', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'Board 1',
      widgets: [{ id: 'w1', type: 'list', database_title: 'Projects', settings: { databaseId: 'db-proj' } }],
    })
    await autoSaveDatabases('user-1')
    const savedMem = mockSaveMemory.mock.calls[0][0]
    expect(savedMem.databases['Projects']).toBe('db-proj')
  })

  it('skips widgets with no databaseId', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'Board 1',
      widgets: [{ id: 'w1', type: 'sticky', settings: {}, database_title: null }],
    })
    await autoSaveDatabases('user-1')
    expect(mockSaveMemory).not.toHaveBeenCalled()
  })
})

// ── getBoardSnapshot ─────────────────────────────────────────────────────────

describe('getBoardSnapshot', () => {
  it('returns empty string when no boards', async () => {
    mockBoardRows.length = 0
    const result = await getBoardSnapshot('user-1')
    expect(result).toBe('')
  })

  it('returns snapshot string for active board', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'My Board',
      widgets: [{ id: 'w1', type: 'sticky', settings: {}, database_title: null }],
    })
    const result = await getBoardSnapshot('user-1')
    expect(result).toContain('My Board')
    expect(result).toContain('id:b1')
    expect(result).toContain('id:w1')
    expect(result).toContain('type:sticky')
  })

  it('includes databaseId in snapshot when present', async () => {
    mockBoardRows.push({
      id: 'b1', name: 'Board',
      widgets: [{ id: 'w1', type: 'list', settings: { databaseId: 'db-abc', title: 'Tasks' }, database_title: null }],
    })
    const result = await getBoardSnapshot('user-1')
    expect(result).toContain('databaseId:db-abc')
    expect(result).toContain('title:"Tasks"')
  })

  it('shows (none) when board has no widgets', async () => {
    mockBoardRows.push({ id: 'b1', name: 'Empty Board', widgets: [] })
    const result = await getBoardSnapshot('user-1')
    expect(result).toContain('(none)')
  })
})

// ── ordinal ──────────────────────────────────────────────────────────────────

describe('ordinal', () => {
  it('returns "st" for 1',   () => { expect(ordinal(1)).toBe('st') })
  it('returns "nd" for 2',   () => { expect(ordinal(2)).toBe('nd') })
  it('returns "rd" for 3',   () => { expect(ordinal(3)).toBe('rd') })
  it('returns "th" for 4',   () => { expect(ordinal(4)).toBe('th') })
  it('returns "th" for 11',  () => { expect(ordinal(11)).toBe('th') })
  it('returns "th" for 12',  () => { expect(ordinal(12)).toBe('th') })
  it('returns "th" for 13',  () => { expect(ordinal(13)).toBe('th') })
  it('returns "st" for 21',  () => { expect(ordinal(21)).toBe('st') })
  it('returns "nd" for 22',  () => { expect(ordinal(22)).toBe('nd') })
  it('returns "rd" for 23',  () => { expect(ordinal(23)).toBe('rd') })
  it('returns "th" for 100', () => { expect(ordinal(100)).toBe('th') })
})

// ── leagueLabel ──────────────────────────────────────────────────────────────

describe('leagueLabel', () => {
  it('maps premierleague to Premier League', () => { expect(leagueLabel('premierleague')).toBe('Premier League') })
  it('maps epl to Premier League',           () => { expect(leagueLabel('epl')).toBe('Premier League') })
  it('maps laliga to La Liga',               () => { expect(leagueLabel('laliga')).toBe('La Liga') })
  it('maps bundesliga to Bundesliga',        () => { expect(leagueLabel('bundesliga')).toBe('Bundesliga') })
  it('maps seriea to Serie A',               () => { expect(leagueLabel('seriea')).toBe('Serie A') })
  it('maps ligue1 to Ligue 1',               () => { expect(leagueLabel('ligue1')).toBe('Ligue 1') })
  it('maps ucl to Champions League',         () => { expect(leagueLabel('ucl')).toBe('Champions League') })
  it('maps mls to MLS',                      () => { expect(leagueLabel('mls')).toBe('MLS') })
  it('returns key unchanged for unknown',    () => { expect(leagueLabel('nfl')).toBe('nfl') })
})
