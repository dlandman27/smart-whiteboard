import { create } from 'zustand'
import { applyThemeVars } from '../themes/presets'
import { LIGHT, DARK } from '../themes/colors'
import { type Background, DEFAULT_BACKGROUND } from '../constants/backgrounds'
import { loadTheme } from '../lib/db'

export type ThemeMode = 'light' | 'dark'

interface ThemeStore {
  mode:          ThemeMode
  background:    Background
  petsEnabled:   boolean

  init:          (userId: string) => Promise<void>
  setMode:       (mode: ThemeMode) => void
  toggleMode:    () => void
  applyToDOM:    () => void
  setBackground: (bg: Background) => void
  setPetsEnabled:(enabled: boolean) => void
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  mode:        'light',
  background:  DEFAULT_BACKGROUND,
  petsEnabled: false,

  init: async (userId: string) => {
    try {
      const theme = await loadTheme(userId)
      if (theme) {
        set({
          mode:        (theme.activeThemeId === 'dark' ? 'dark' : 'light') as ThemeMode,
          background:  theme.background ?? DEFAULT_BACKGROUND,
          petsEnabled: theme.petsEnabled,
        })
      }
    } catch (err) {
      console.error('Failed to load theme from Supabase:', err)
    }
    get().applyToDOM()
  },

  setMode: (mode) => {
    set({ mode })
    applyThemeVars(mode === 'dark' ? DARK : LIGHT)
  },

  toggleMode: () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light'
    get().setMode(next)
  },

  applyToDOM: () => {
    applyThemeVars(get().mode === 'dark' ? DARK : LIGHT)
  },

  setBackground:  (bg) => set({ background: bg }),
  setPetsEnabled: (enabled) => set({ petsEnabled: enabled }),
}))
