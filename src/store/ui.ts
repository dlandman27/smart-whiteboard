import { create } from 'zustand'

type WidgetCmd = 'fullscreen' | 'settings' | 'delete' | 'split'
export type SidebarMode = 'full' | 'icons' | 'hidden'

const SIDEBAR_WIDTHS: Record<SidebarMode, number> = { full: 200, icons: 56, hidden: 0 }

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
  displayMode:         boolean
  setDisplayMode:      (on: boolean) => void
  toggleDisplayMode:   () => void
  screensaverMode:     boolean
  setScreensaverMode:  (on: boolean) => void
  sidebarMode:         SidebarMode
  sidebarWidth:        number
  cycleSidebarMode:    () => void
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
  displayMode:         false,
  setDisplayMode:      (on) => set({ displayMode: on }),
  toggleDisplayMode:   () => set((s) => ({ displayMode: !s.displayMode })),
  screensaverMode:     false,
  setScreensaverMode:  (on) => set({ screensaverMode: on }),
  sidebarMode:         'full',
  sidebarWidth:        200,
  cycleSidebarMode:    () => set((s) => {
    const next: SidebarMode = s.sidebarMode === 'full' ? 'icons' : s.sidebarMode === 'icons' ? 'hidden' : 'full'
    return { sidebarMode: next, sidebarWidth: SIDEBAR_WIDTHS[next] }
  }),
}))
