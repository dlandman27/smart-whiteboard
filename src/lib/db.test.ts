import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a mock chain that tracks calls
function mockChain() {
  const chain: any = {
    _calls: {} as Record<string, any[]>,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  // Make eq after delete also resolve
  chain.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  return chain
}

const boardChain = mockChain()
const widgetChain = mockChain()
const themeChain = mockChain()
const drawingChain = mockChain()

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'boards') return boardChain
      if (table === 'widgets') return widgetChain
      if (table === 'user_theme') return themeChain
      if (table === 'board_drawings') return drawingChain
      return mockChain()
    }),
  },
}))

import { loadBoards, upsertBoard, upsertWidget, deleteBoard, deleteWidget, loadTheme, upsertTheme, loadDrawing, upsertDrawing } from './db'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadBoards', () => {
  it('maps all board fields including board_type, background, widget_style', async () => {
    boardChain.order.mockResolvedValue({
      data: [{
        id: 'b1', user_id: 'u1', name: 'Test', layout_id: 'dashboard',
        board_type: 'calendar', calendar_id: 'primary',
        slot_gap: 8, slot_pad: 12,
        custom_slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }],
        background: { label: 'Dark', bg: '#000', dot: '#333' },
        widget_style: 'glass', ord: 0,
      }],
      error: null,
    })
    widgetChain.in.mockResolvedValue({
      data: [{
        id: 'w1', board_id: 'b1', user_id: 'u1', type: '@whiteboard/clock',
        variant_id: 'analog', settings: { size: 'large' },
        database_id: null, calendar_id: null, database_title: '',
        x: 10, y: 20, width: 300, height: 200, slot_id: 'main',
      }],
      error: null,
    })

    const boards = await loadBoards('u1')
    expect(boards).toHaveLength(1)
    expect(boards[0].boardType).toBe('calendar')
    expect(boards[0].calendarId).toBe('primary')
    expect(boards[0].background).toEqual({ label: 'Dark', bg: '#000', dot: '#333' })
    expect(boards[0].widgetStyle).toBe('glass')
    expect(boards[0].customSlots).toEqual([{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }])
    expect(boards[0].widgets[0].variantId).toBe('analog')
    expect(boards[0].widgets[0].slotId).toBe('main')
  })

  it('returns empty array when no boards exist', async () => {
    boardChain.order.mockResolvedValue({ data: [], error: null })
    const boards = await loadBoards('u1')
    expect(boards).toEqual([])
  })

  it('throws on Supabase error', async () => {
    boardChain.order.mockResolvedValue({ data: null, error: { message: 'fail' } })
    await expect(loadBoards('u1')).rejects.toEqual({ message: 'fail' })
  })
})

describe('upsertBoard', () => {
  it('sends all fields including new columns', async () => {
    const board = {
      id: 'b1', name: 'Test', layoutId: 'dashboard',
      boardType: 'todo' as const, calendarId: undefined,
      widgets: [], slotGap: 8, slotPad: 12,
      customSlots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }],
      background: { label: 'Dark', bg: '#000', dot: '#333' },
      widgetStyle: 'glass' as const,
    }
    await upsertBoard(board, 'u1', 0)
    expect(boardChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      board_type: 'todo',
      background: { label: 'Dark', bg: '#000', dot: '#333' },
      widget_style: 'glass',
      custom_slots: [{ id: 's1', x: 0, y: 0, width: 0.5, height: 1 }],
    }))
  })
})

describe('upsertWidget', () => {
  it('sends variant_id', async () => {
    const widget = {
      id: 'w1', type: '@whiteboard/clock', variantId: 'analog',
      databaseTitle: '', settings: {}, x: 0, y: 0, width: 300, height: 200,
    }
    await upsertWidget(widget, 'b1', 'u1')
    expect(widgetChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      variant_id: 'analog',
    }))
  })
})

describe('deleteBoard', () => {
  it('calls delete with correct id', async () => {
    await deleteBoard('b1')
    expect(boardChain.delete).toHaveBeenCalled()
  })
})

describe('deleteWidget', () => {
  it('calls delete with correct id', async () => {
    await deleteWidget('w1')
    expect(widgetChain.delete).toHaveBeenCalled()
  })
})

describe('loadTheme', () => {
  it('maps theme fields correctly', async () => {
    themeChain.single.mockResolvedValue({
      data: {
        user_id: 'u1', active_theme_id: 'dracula',
        custom_overrides: { bg: '#282a36' }, custom_theme: null,
        background: { label: 'Dark', bg: '#000' }, pets_enabled: true,
      },
      error: null,
    })
    const theme = await loadTheme('u1')
    expect(theme?.activeThemeId).toBe('dracula')
    expect(theme?.petsEnabled).toBe(true)
    expect(theme?.background).toEqual({ label: 'Dark', bg: '#000' })
  })

  it('returns null when no theme exists', async () => {
    themeChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const theme = await loadTheme('u1')
    expect(theme).toBeNull()
  })
})

describe('upsertTheme', () => {
  it('sends all theme fields', async () => {
    await upsertTheme('u1', {
      activeThemeId: 'minimal',
      customOverrides: {},
      customTheme: null,
      background: { label: 'Light', bg: '#fff' } as any,
      petsEnabled: false,
    })
    expect(themeChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      active_theme_id: 'minimal',
      pets_enabled: false,
    }))
  })
})

describe('loadDrawing', () => {
  it('returns data_url when drawing exists', async () => {
    drawingChain.single.mockResolvedValue({ data: { data_url: 'data:image/png;base64,abc' }, error: null })
    const url = await loadDrawing('b1')
    expect(url).toBe('data:image/png;base64,abc')
  })

  it('returns null when no drawing exists', async () => {
    drawingChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const url = await loadDrawing('b1')
    expect(url).toBeNull()
  })
})
