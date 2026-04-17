import { create } from 'zustand'
import type { WidgetLayout, LayoutSlot } from '../types'
import { analytics } from '../lib/analytics'
import type { Background } from '../constants/backgrounds'
import type { BoardSchedule } from '../constants/schedulePresets'
import { DEFAULT_SCHEDULE } from '../constants/schedulePresets'
import { DEFAULT_LAYOUT_ID } from '../layouts/presets'
import { loadBoards, loadSchedule } from '../lib/db'
import { markBoardCreated } from '../lib/syncBoards'

export type WidgetStyle = 'solid' | 'glass' | 'glass-dark' | 'glass-light' | 'borderless' | 'none'

export interface Board {
  id: string
  name: string
  layoutId: string
  boardType?: 'calendar' | 'settings' | 'connectors' | 'today' | 'todo' | 'feedback' | 'agents' | 'routines'
  calendarId?: string
  widgets: WidgetLayout[]
  slotGap?: number
  slotPad?: number
  customSlots?: LayoutSlot[]
  background?: Background
  widgetStyle?: WidgetStyle
}

interface WhiteboardStore {
  boards: Board[]
  activeBoardId: string
  userId: string | null
  isLoading: boolean
  schedule: BoardSchedule
  lastManualSwitch: number  // timestamp of last manual board switch
  init: (userId: string) => Promise<void>

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
  updateLayout:      (id: string, updates: Partial<Pick<WidgetLayout, 'x' | 'y' | 'width' | 'height'>>) => void
  updateSettings:    (id: string, settings: Record<string, unknown>) => void
  updateWidgetStyle: (id: string, style: WidgetStyle | undefined) => void
  removeWidget:     (id: string) => void
  clearWidgets:     () => void
  assignSlot:       (widgetId: string, slotId: string | null) => void
  splitWidget:      (widgetId: string) => void
  setLayoutSpacing:    (boardId: string, gap: number, pad: number) => void
  reorderBoards:       (fromIndex: number, toIndex: number) => void
  setBoardBackground:  (boardId: string, background: Background) => void
  setBoardWidgetStyle: (boardId: string, style: WidgetStyle) => void
  setSchedule: (schedule: BoardSchedule) => void
  setActiveBoardManual: (id: string) => void
}

// Deterministic UUIDs for system boards (v4 format, fixed values)
const DEFAULT_ID                   = '00000000-0000-4000-8000-000000000001'
const DEFAULT_CAL_ID               = '00000000-0000-4000-8000-000000000002'
export const DEFAULT_SETTINGS_ID   = '00000000-0000-4000-8000-000000000003'
export const DEFAULT_CONNECTORS_ID = '00000000-0000-4000-8000-000000000004'
export const DEFAULT_TODAY_ID      = '00000000-0000-4000-8000-000000000005'
export const DEFAULT_TODO_ID       = '00000000-0000-4000-8000-000000000006'
export const DEFAULT_FEEDBACK_ID   = '00000000-0000-4000-8000-000000000007'
export const DEFAULT_AGENTS_ID     = '00000000-0000-4000-8000-000000000008'
export const DEFAULT_ROUTINES_ID   = '00000000-0000-4000-8000-000000000009'

function ensureCalendarBoard(boards: Board[]): Board[] {
  if (boards.some((b) => b.boardType === 'calendar')) return boards
  return [...boards, { id: DEFAULT_CAL_ID, name: 'Calendar', layoutId: DEFAULT_LAYOUT_ID, boardType: 'calendar', calendarId: 'primary', widgets: [] }]
}

export function ensureSystemBoards(boards: Board[]): Board[] {
  let result = ensureCalendarBoard(boards)
  if (!result.some((b) => b.boardType === 'settings')) {
    result = [...result, { id: DEFAULT_SETTINGS_ID, name: 'Settings', layoutId: DEFAULT_LAYOUT_ID, boardType: 'settings', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'connectors')) {
    result = [...result, { id: DEFAULT_CONNECTORS_ID, name: 'Connectors', layoutId: DEFAULT_LAYOUT_ID, boardType: 'connectors', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'today')) {
    result = [...result, { id: DEFAULT_TODAY_ID, name: 'Today', layoutId: DEFAULT_LAYOUT_ID, boardType: 'today', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'todo')) {
    result = [...result, { id: DEFAULT_TODO_ID, name: 'Todo', layoutId: DEFAULT_LAYOUT_ID, boardType: 'todo', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'feedback')) {
    result = [...result, { id: DEFAULT_FEEDBACK_ID, name: 'Feedback', layoutId: DEFAULT_LAYOUT_ID, boardType: 'feedback', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'agents')) {
    result = [...result, { id: DEFAULT_AGENTS_ID, name: 'Agents', layoutId: DEFAULT_LAYOUT_ID, boardType: 'agents', widgets: [] }]
  }
  if (!result.some((b) => b.boardType === 'routines')) {
    result = [...result, { id: DEFAULT_ROUTINES_ID, name: 'Routines', layoutId: DEFAULT_LAYOUT_ID, boardType: 'routines', widgets: [] }]
  }
  return result
}

const defaultBoards = ensureSystemBoards([{ id: DEFAULT_ID, name: 'Main', layoutId: DEFAULT_LAYOUT_ID, widgets: [] }])

export const useWhiteboardStore = create<WhiteboardStore>()(
  (set, get) => ({
    boards: defaultBoards,
    activeBoardId: DEFAULT_ID,
    userId: null,
    isLoading: false,
    schedule: DEFAULT_SCHEDULE,
    lastManualSwitch: 0,

    init: async (userId: string) => {
      set({ isLoading: true, userId })
      try {
        const [boards, schedule] = await Promise.all([
          loadBoards(userId),
          loadSchedule(userId),
        ])
        const hydrated = ensureSystemBoards(
          boards.length > 0
            ? boards
            : [{ id: DEFAULT_ID, name: 'Main', layoutId: DEFAULT_LAYOUT_ID, widgets: [] }]
        )
        const activeBoardId = hydrated[0]?.id ?? DEFAULT_ID
        set({ boards: hydrated, activeBoardId, schedule: schedule ?? DEFAULT_SCHEDULE, isLoading: false })
      } catch (err) {
        console.error('Failed to load boards from Supabase:', err)
        // Fall back to defaults on error
        set({ boards: defaultBoards, activeBoardId: DEFAULT_ID, isLoading: false })
      }
    },

    addBoard: (name, presetId) => {
      const id = presetId ?? crypto.randomUUID()
      markBoardCreated(id)
      analytics.track('board_created', { boardId: id, name })
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

    removeBoard: (id) => {
      const board = get().boards.find((b) => b.id === id)
      analytics.track('board_deleted', { boardId: id, name: board?.name })
      set((s) => {
        if (s.boards.length <= 1) return s
        const remaining  = s.boards.filter((b) => b.id !== id)
        const idx        = s.boards.findIndex((b) => b.id === id)
        const nextActive = s.activeBoardId === id
          ? (remaining[Math.min(idx, remaining.length - 1)]?.id ?? remaining[0].id)
          : s.activeBoardId
        return { boards: remaining, activeBoardId: nextActive }
      })
    },

    setActiveBoard: (id) => set({ activeBoardId: id }),

    renameBoard: (id, name) =>
      set((s) => ({
        boards: s.boards.map((b) => b.id === id ? { ...b, name } : b),
      })),

    setLayout: (boardId, layoutId, widgetUpdates) => {
      analytics.track('layout_changed', { boardId, layoutId })
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
      }))
    },

    setCustomLayout: (boardId, slots) =>
      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === boardId ? { ...b, layoutId: 'custom', customSlots: slots } : b
        ),
      })),

    addWidget: (widget) => {
      analytics.track('widget_added', { type: widget.type, variantId: widget.variantId, boardId: get().activeBoardId })
      set((s) => ({
        boards: s.boards.map((b) => {
          if (b.id !== s.activeBoardId) return b
          const id = (widget as any).id ?? crypto.randomUUID()
          if (b.widgets.some((w) => w.id === id)) return b  // dedup
          return { ...b, widgets: [...b.widgets, { ...widget, id }] }
        }),
      }))
    },

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

    updateWidgetStyle: (id, style) =>
      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === s.activeBoardId
            ? { ...b, widgets: b.widgets.map((w) => w.id === id ? { ...w, widgetStyle: style } : w) }
            : b
        ),
      })),

    removeWidget: (id) => {
      const { boards, activeBoardId } = get()
      const widget = boards.find((b) => b.id === activeBoardId)?.widgets.find((w) => w.id === id)
      analytics.track('widget_removed', { type: widget?.type, variantId: widget?.variantId, boardId: activeBoardId })
      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === s.activeBoardId
            ? { ...b, widgets: b.widgets.filter((w) => w.id !== id) }
            : b
        ),
      }))
    },

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

    splitWidget: (widgetId) =>
      set((s) => ({
        boards: s.boards.map((b) => {
          if (b.id !== s.activeBoardId) return b
          const w = b.widgets.find((w) => w.id === widgetId)
          if (!w) return b
          const paneA = {
            type:      w.type ?? '',
            variantId: w.variantId ?? 'default',
            settings:  w.settings ?? {},
          }
          return {
            ...b,
            widgets: b.widgets.map((ww) =>
              ww.id === widgetId
                ? {
                    ...ww,
                    type:      '@whiteboard/split',
                    variantId: 'default',
                    settings:  {
                      orientation: 'horizontal',
                      split:       50,
                      paneA,
                      paneB:       null,
                    },
                    width:  Math.max(ww.width,  480),
                    height: Math.max(ww.height, 280),
                  }
                : ww
            ),
          }
        }),
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

    setBoardBackground: (boardId, background) =>
      set((s) => ({
        boards: s.boards.map((b) => b.id === boardId ? { ...b, background } : b),
      })),

    setBoardWidgetStyle: (boardId, widgetStyle) =>
      set((s) => ({
        boards: s.boards.map((b) => b.id === boardId ? { ...b, widgetStyle } : b),
      })),

    setSchedule: (schedule) => set({ schedule }),

    setActiveBoardManual: (id) => {
      const board = get().boards.find((b) => b.id === id)
      analytics.track('board_switched', { boardId: id, name: board?.name, boardType: board?.boardType ?? 'user' })
      set({ activeBoardId: id, lastManualSwitch: Date.now() })
    },
  })
)

