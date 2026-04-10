import { create } from 'zustand'

type WidgetCmd = 'fullscreen' | 'settings' | 'delete' | 'split'

interface UIStore {
  focusedWidgetId:     string | null
  setFocusedWidget:    (id: string | null) => void
  flashingWidgetId:    string | null
  flashWidget:         (id: string) => void
  canvasSize:          { w: number; h: number }
  setCanvasSize:       (w: number, h: number) => void
  widgetCommand:       { id: string; cmd: WidgetCmd } | null
  sendWidgetCommand:   (id: string, cmd: WidgetCmd) => void
  clearWidgetCommand:  () => void
  fullscreenWidgetId:  string | null
  setFullscreenWidget: (id: string | null) => void
}

export const useUIStore = create<UIStore>()((set) => ({
  focusedWidgetId:     null,
  setFocusedWidget:    (id) => set({ focusedWidgetId: id }),
  flashingWidgetId:    null,
  flashWidget: (id) => {
    set({ flashingWidgetId: id })
    setTimeout(() => set((s) => s.flashingWidgetId === id ? { flashingWidgetId: null } : s), 2000)
  },
  canvasSize:          { w: window.innerWidth, h: window.innerHeight },
  setCanvasSize:       (w, h) => set({ canvasSize: { w, h } }),
  widgetCommand:       null,
  sendWidgetCommand:   (id, cmd) => set({ widgetCommand: { id, cmd } }),
  clearWidgetCommand:  () => set({ widgetCommand: null }),
  fullscreenWidgetId:  null,
  setFullscreenWidget: (id) => set({ fullscreenWidgetId: id }),
}))
