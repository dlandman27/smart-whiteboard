import { create } from 'zustand'
import { type ThemeVars, THEME_MAP, applyThemeVars } from '../themes/presets'
import { type Background, DEFAULT_BACKGROUND } from '../constants/backgrounds'
import { loadTheme } from '../lib/db'

interface ThemeStore {
  activeThemeId:   string
  customOverrides: Partial<ThemeVars>
  customTheme:     ThemeVars | null
  background:      Background
  petsEnabled:     boolean

  init:           (userId: string) => Promise<void>
  setTheme:       (id: string) => void
  setCustomTheme: (vars: Partial<ThemeVars>, background?: Background, baseThemeId?: string) => void
  setOverride:    (key: keyof ThemeVars, value: string) => void
  clearOverrides: () => void
  applyToDOM:     () => void
  setBackground:  (bg: Background) => void
  setPetsEnabled: (enabled: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  (set, get) => ({
    activeThemeId:   'slate',
    customOverrides: {},
    customTheme:     null,
    background:      DEFAULT_BACKGROUND,
    petsEnabled:     false,

    init: async (userId: string) => {
      try {
        const theme = await loadTheme(userId)
        if (theme) {
          set({
            activeThemeId:   theme.activeThemeId,
            customOverrides: theme.customOverrides as Partial<ThemeVars>,
            customTheme:     (theme.customTheme as ThemeVars | null) ?? null,
            background:      theme.background ?? DEFAULT_BACKGROUND,
            petsEnabled:     theme.petsEnabled,
          })
        }
      } catch (err) {
        console.error('Failed to load theme from Supabase:', err)
      }
      // Apply whatever we have to the DOM
      get().applyToDOM()
    },

    setTheme: (id) => {
      const theme = THEME_MAP[id]
      set({ activeThemeId: id, customOverrides: {}, customTheme: null })
      if (theme) applyThemeVars(theme.vars)
    },

    setCustomTheme: (vars, background, baseThemeId) => {
      const base = THEME_MAP[baseThemeId ?? 'slate']?.vars ?? THEME_MAP['slate'].vars
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
  })
)
