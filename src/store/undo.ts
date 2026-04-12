import { create } from 'zustand'
import type { WidgetLayout } from '../types'

const MAX_UNDO = 10

interface UndoEntry {
  id:       string
  label:    string
  snapshot: WidgetLayout
}

interface UndoStore {
  stack: UndoEntry[]
  push:  (label: string, snapshot: WidgetLayout) => void
  pop:   () => UndoEntry | null
  clear: () => void
}

export const useUndoStore = create<UndoStore>()((set, get) => ({
  stack: [],
  push: (label, snapshot) =>
    set((s) => ({
      stack: [{ id: crypto.randomUUID(), label, snapshot }, ...s.stack].slice(0, MAX_UNDO),
    })),
  pop: () => {
    const [top, ...rest] = get().stack
    if (!top) return null
    set({ stack: rest })
    return top
  },
  clear: () => set({ stack: [] }),
}))
