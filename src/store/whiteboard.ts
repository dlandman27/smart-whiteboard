import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WidgetLayout } from '../types'

export interface Board {
  id: string
  name: string
  widgets: WidgetLayout[]
}

interface WhiteboardStore {
  boards: Board[]
  activeBoardId: string

  // Board management
  addBoard: (name: string) => void
  setActiveBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void

  // Widget management (always on the active board)
  addWidget: (widget: Omit<WidgetLayout, 'id'>) => void
  updateLayout: (id: string, updates: Partial<Pick<WidgetLayout, 'x' | 'y' | 'width' | 'height'>>) => void
  removeWidget: (id: string) => void
}

const DEFAULT_ID = 'default'

export const useWhiteboardStore = create<WhiteboardStore>()(
  persist(
    (set) => ({
      boards: [{ id: DEFAULT_ID, name: 'Main', widgets: [] }],
      activeBoardId: DEFAULT_ID,

      addBoard: (name) => {
        const id = crypto.randomUUID()
        set((s) => ({
          boards: [...s.boards, { id, name, widgets: [] }],
          activeBoardId: id,
        }))
      },

      setActiveBoard: (id) => set({ activeBoardId: id }),

      renameBoard: (id, name) =>
        set((s) => ({
          boards: s.boards.map((b) => (b.id === id ? { ...b, name } : b)),
        })),

      addWidget: (widget) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: [...b.widgets, { ...widget, id: crypto.randomUUID() }] }
              : b
          ),
        })),

      updateLayout: (id, updates) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === s.activeBoardId
              ? { ...b, widgets: b.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)) }
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
    }),
    {
      name: 'whiteboard-layout',
      version: 1,
      // Migrate old flat { widgets: [] } format to boards format
      migrate: (state: any, version: number) => {
        if (version === 0) {
          return {
            boards: [{ id: DEFAULT_ID, name: 'Main', widgets: state?.widgets ?? [] }],
            activeBoardId: DEFAULT_ID,
          }
        }
        return state
      },
    }
  )
)
