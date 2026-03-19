import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeVars, THEME_MAP, applyThemeVars } from '../themes/presets'
import { type Background, DEFAULT_BACKGROUND } from '../constants/backgrounds'

interface ThemeStore {
  activeThemeId:   string
  customOverrides: Partial<ThemeVars>
  background:      Background

  setTheme:           (id: string) => void
  setOverride:        (key: keyof ThemeVars, value: string) => void
  clearOverrides:     () => void
  applyToDOM:         () => void
  setBackground:      (bg: Background) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      activeThemeId:   'minimal',
      customOverrides: {},
      background:      DEFAULT_BACKGROUND,

      setTheme: (id) => {
        const theme = THEME_MAP[id]
        set({ activeThemeId: id, customOverrides: {}, ...(theme ? { background: theme.background } : {}) })
        if (theme) applyThemeVars(theme.vars)
      },

      setBackground: (bg) => set({ background: bg }),

      setOverride: (key, value) => {
        const overrides = { ...get().customOverrides, [key]: value }
        set({ customOverrides: overrides })
        const base = THEME_MAP[get().activeThemeId]?.vars ?? {}
        applyThemeVars({ ...base, ...overrides } as ThemeVars)
      },

      clearOverrides: () => {
        set({ customOverrides: {} })
        const theme = THEME_MAP[get().activeThemeId]
        if (theme) applyThemeVars(theme.vars)
      },

      applyToDOM: () => {
        const { activeThemeId, customOverrides } = get()
        const base = THEME_MAP[activeThemeId]?.vars
        if (base) applyThemeVars({ ...base, ...customOverrides } as ThemeVars)
      },
    }),
    {
      name: 'widget-theme',
      version: 1,
    }
  )
)
