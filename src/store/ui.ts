import { create } from 'zustand'

interface UIStore {
  focusedWidgetId: string | null
  setFocusedWidget: (id: string | null) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  focusedWidgetId: null,
  setFocusedWidget: (id) => set({ focusedWidgetId: id }),
}))
