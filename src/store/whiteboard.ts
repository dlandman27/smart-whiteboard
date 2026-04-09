import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WidgetLayout, LayoutSlot } from '../types'
import { DEFAULT_LAYOUT_ID } from '../layouts/presets'

export interface Board {
  id: string
  name: string
  layoutId: string
  boardType?: 'calendar' | 'settings' | 'connectors'
  calendarId?: string
  widgets: WidgetLayout[]
  slotGap?: number
  slotPad?: number
  customSlots?: LayoutSlot[]
}

interface WhiteboardStore {
  boards: Board[]
  activeBoardId: string

  // Board management
  addBoard:            (name: string, id?: string) => void
  addCalendarBoard:    (name?: string) => void
  removeBoard:      (id: string) => void
  setActiveBoard:   (id: string) => void
  renameBoard:      (id: string, name: string) => void
  setLayout:        (boardId: string, layoutId: string, widgetUpdates?: Array<{ id: string; slotId: string | null; x: number; y: number; width: number; height: number }>) => void
  setCustomLayout:  (boardId: string, slots: LayoutSlot[]) => void

  // Widget management (always on the active board)
  addWidget:        (widget: Omit<WidgetLayout, 'id'>) => void
  updateLayout:     (id: string, updates: Partial<Pick<WidgetLayout, 'x' | 'y' | 'width' | 'height'>>) => void
  updateSettings:   (id: string, settings: Record<string, unknown>) => void
  removeWidget:     (id: string) => void
  clearWidgets:     () => void
  assignSlot:       (widgetId: string, slotId: string | null) => void
  setLayoutSpacing: (boardId: string, gap: number, pad: number) => void
  reorderBoards:    (fromIndex: number, toIndex: number) => void
}

const DEFAULT_ID           = crypto.randomUUID()
const DEFAULT_CAL_ID       = crypto.randomUUID()
export const DEFAULT_SETTINGS_ID   = 'system-settings-board'
export const DEFAULT_CONNECTORS_ID = 'system-connectors-board'

function ensureCalendarBoard(boards: Board[]): Board[] {
  if (boards.some((b) => b.boardType === 'calendar')) return boards
  return [...boards, { id: DEFAULT_CAL_ID, name: 'Calendar', layoutId: DEFAULT_LAYOUT_ID, boardType: 'calendar', calendarId: 'primary', widgets: [] }]
}

function ensureSystemBoards(boards: Board[]): Board[] {
  let result = ensureCalendarBoard(boards)
  if (!result.some((b) => b.boardType === 'settings')) {
    result = [...result, { id: DEFAULT_SETTINGS_ID, name: 'Settings', layoutId: DEFAULT_LAYOUT_ID, boardType: 'settings', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'connectors')) {
    result = [...result, { id: DEFAULT_CONNECTORS_ID, name: 'Connectors', layoutId: DEFAULT_LAYOUT_ID, boardType: 'connectors', widgets: [] }]
  }
  return result
}

export const useWhiteboardStore = create<WhiteboardStore>()(
  persist(
    (set) => ({
      boards: ensureSystemBoards([{ id: DEFAULT_ID, name: 'Main', layoutId: DEFAULT_LAYOUT_ID, widgets: [] }]),
      activeBoardId: DEFAULT_ID,

      addBoard: (name, presetId) => {
        const id = presetId ?? crypto.randomUUID()
        set((s) => ({
          boards:        [...s.boards, { id, name, layoutId: DEFAULT_LAYOUT_ID, widgets: [] }],
          activeBoardId: id,
        }))
      },

      addCalendarBoard: (name = 'Calendar') => {
        const id = crypto.randomUUID()
        set((s) => ({
          boards:        [...s.boards, { id, name, layoutId: DEFAULT_LAYOUT_ID, boardType: 'calendar', calendarId: 'primary', widgets: [] }],
          activeBoardId: id,
        }))
      },

      removeBoard: (id) =>
        set((s) => {
          if (s.boards.length <= 1) return s
          const remaining  = s.boards.filter((b) => b.id !== id)
          const idx        = s.boards.findIndex((b) => b.id === id)
          const nextActive = s.activeBoardId === id
            ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id)
            : s.activeBoardId
          return { boards: remaining, activeBoardId: nextActive }
        }),

      setActiveBoard: (id) => set({ activeBoardId: id }),

      renameBoard: (id, name) =>
        set((s) => ({
          boards: s.boards.map((b) => b.id === id ? { ...b, name } : b),
        })),

      setLayout: (boardId, layoutId, widgetUpdates) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b
            const widgets = widgetUpdates
              ? b.widgets.map((w) => {
                  const upd = widgetUpdates.find((u) => u.id === w.id)
                  if (!upd) return w
                  return { ...w, slotId: upd.slotId ?? undefined, x: upd.x, y: upd.y, width: upd.width, height: upd.height }
                })
              : b.widgets
            return { ...b, layoutId, widgets }
          }),
        })),

      setCustomLayout: (boardId, slots) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, layoutId: 'custom', customSlots: slots } : b
          ),
        })),

      addWidget: (widget) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== s.activeBoardId) return b
            const id = (widget as any).id ?? crypto.randomUUID()
            if (b.widgets.some((w) => w.id === id)) return b  // dedup
            return { ...b, widgets: [...b.widgets, { ...widget, id }] }
          }),
        })),

      updateLayout: (id, updates) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: b.widgets.map((w) => w.id === id ? { ...w, ...updates } : w) }
              : b
          ),
        })),

      updateSettings: (id, settings) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: b.widgets.map((w) => w.id === id ? { ...w, settings: { ...w.settings, ...settings } } : w) }
              : b
          ),
        })),

      removeWidget: (id) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: b.widgets.filter((w) => w.id !== id) }
              : b
          ),
        })),

      clearWidgets: () =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId ? { ...b, widgets: [] } : b
          ),
        })),

      assignSlot: (widgetId, slotId) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: b.widgets.map((w) => w.id === widgetId ? { ...w, slotId: slotId ?? undefined } : w) }
              : b
          ),
        })),

      setLayoutSpacing: (boardId, gap, pad) =>
        set((s) => ({
          boards: s.boards.map((b) => b.id === boardId ? { ...b, slotGap: gap, slotPad: pad } : b),
        })),

      reorderBoards: (fromIndex, toIndex) =>
        set((s) => {
          const next = [...s.boards]
          const [moved] = next.splice(fromIndex, 1)
          next.splice(toIndex, 0, moved)
          return { boards: next }
        }),
    }),
    {
      name: 'whiteboard-layout',
      version: 6,
      migrate: (state: any, version: number) => {
        if (version < 2) {
          return {
            boards: ensureSystemBoards([{ id: DEFAULT_ID, name: 'Main', layoutId: DEFAULT_LAYOUT_ID, widgets: state?.widgets ?? [] }]),
            activeBoardId: DEFAULT_ID,
          }
        }
        if (version < 3) {
          return {
            ...state,
            boards: ensureSystemBoards((state.boards ?? []).map((b: any) => ({
              ...b,
              layoutId: b.layoutId ?? DEFAULT_LAYOUT_ID,
            }))),
          }
        }
        // v6: ensure every user has calendar, settings, and connectors boards
        return { ...state, boards: ensureSystemBoards(state.boards ?? []) }
      },
    }
  )
)
