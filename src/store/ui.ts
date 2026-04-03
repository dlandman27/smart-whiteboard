import { create } from 'zustand'

interface UIStore {
  focusedWidgetId:  string | null
  setFocusedWidget: (id: string | null) => void
  flashingWidgetId: string | null
  flashWidget:      (id: string) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  focusedWidgetId:  null,
  setFocusedWidget: (id) => set({ focusedWidgetId: id }),
  flashingWidgetId: null,
  flashWidget: (id) => {
    set({ flashingWidgetId: id })
    setTimeout(() => set((s) => s.flashingWidgetId === id ? { flashingWidgetId: null } : s), 2000)
  },
}))
