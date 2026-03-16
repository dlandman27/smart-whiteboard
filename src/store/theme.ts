import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeVars, THEME_MAP, applyThemeVars } from '../themes/presets'

interface ThemeStore {
  activeThemeId:  string
  customOverrides: Partial<ThemeVars>

  setTheme:       (id: string) => void
  setOverride:    (key: keyof ThemeVars, value: string) => void
  clearOverrides: () => void
  applyToDOM:     () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      activeThemeId:  'minimal',
      customOverrides: {},

      setTheme: (id) => {
        set({ activeThemeId: id, customOverrides: {} })
        const theme = THEME_MAP[id]
        if (theme) applyThemeVars(theme.vars)
      },

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
