import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeVars, THEME_MAP, applyThemeVars } from '../themes/presets'
import { type Background, DEFAULT_BACKGROUND } from '../constants/backgrounds'

interface ThemeStore {
  activeThemeId:   string
  customOverrides: Partial<ThemeVars>
  customTheme:     ThemeVars | null
  background:      Background
  petsEnabled:     boolean

  setTheme:           (id: string) => void
  setCustomTheme:     (vars: Partial<ThemeVars>, background?: Background, baseThemeId?: string) => void
  setOverride:        (key: keyof ThemeVars, value: string) => void
  clearOverrides:     () => void
  applyToDOM:         () => void
  setBackground:      (bg: Background) => void
  setPetsEnabled:     (enabled: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      activeThemeId:   'minimal',
      customOverrides: {},
      customTheme:     null,
      background:      DEFAULT_BACKGROUND,
      petsEnabled:     true,

      setTheme: (id) => {
        const theme = THEME_MAP[id]
        set({ activeThemeId: id, customOverrides: {}, customTheme: null })
        if (theme) applyThemeVars(theme.vars)
      },

      setCustomTheme: (vars, background, baseThemeId) => {
        const base = THEME_MAP[baseThemeId ?? 'minimal']?.vars ?? THEME_MAP['minimal'].vars
        const fullVars = { ...base, ...vars } as ThemeVars
        set({
          activeThemeId: 'custom',
          customTheme:   fullVars,
          customOverrides: {},
          ...(background ? { background } : {}),
        })
        applyThemeVars(fullVars)
      },

      setBackground: (bg) => set({ background: bg }),

      setOverride: (key, value) => {
        const overrides = { ...get().customOverrides, [key]: value }
        set({ customOverrides: overrides })
        const base = THEME_MAP[get().activeThemeId]?.vars ?? {}
        applyThemeVars({ ...base, ...overrides } as ThemeVars)
      },

      setPetsEnabled: (enabled) => set({ petsEnabled: enabled }),

      clearOverrides: () => {
        set({ customOverrides: {} })
        const theme = THEME_MAP[get().activeThemeId]
        if (theme) applyThemeVars(theme.vars)
      },

      applyToDOM: () => {
        const { activeThemeId, customOverrides, customTheme } = get()
        if (activeThemeId === 'custom' && customTheme) {
          applyThemeVars(customTheme)
          return
        }
        const base = THEME_MAP[activeThemeId]?.vars
        if (base) applyThemeVars({ ...base, ...customOverrides } as ThemeVars)
      },
    }),
    {
      name: 'widget-theme',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Record<string, unknown>
        // v0 → v1: petsEnabled didn't exist
        if (version < 1) state.petsEnabled = true
        // v1 → v2: ensure background is always set
        if (version < 2) state.background = state.background ?? DEFAULT_BACKGROUND
        return state
      },
    }
  )
)
