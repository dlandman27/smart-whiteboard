import { create } from 'zustand'
import type { WidgetLayout } from '../types'

interface UndoEntry {
  id:       string
  label:    string
  snapshot: WidgetLayout
}

interface UndoStore {
  entry: UndoEntry | null
  push:  (label: string, snapshot: WidgetLayout) => void
  clear: () => void
}

export const useUndoStore = create<UndoStore>()((set) => ({
  entry: null,
  push:  (label, snapshot) => set({ entry: { id: crypto.randomUUID(), label, snapshot } }),
  clear: () => set({ entry: null }),
}))
