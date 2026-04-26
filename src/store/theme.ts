import { create } from 'zustand'
import { applyThemeVars } from '../themes/presets'
import { LIGHT, DARK } from '../themes/colors'
import { type Background, DEFAULT_BACKGROUND } from '../constants/backgrounds'
import { loadTheme } from '../lib/db'

export type ThemeMode = 'light' | 'dark' | 'system'

// Resolves 'system' to the actual OS preference
export function effectiveDark(mode: ThemeMode): boolean {
  if (mode === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches
  return mode === 'dark'
}

// Single long-lived listener for system preference changes
let _mqlListener: (() => void) | null = null

function attachSystemListener(applyToDOM: () => void) {
  detachSystemListener()
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  _mqlListener = () => applyToDOM()
  mql.addEventListener('change', _mqlListener)
}

function detachSystemListener() {
  if (_mqlListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', _mqlListener)
    _mqlListener = null
  }
}

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
  mode:        'system',
  background:  DEFAULT_BACKGROUND,
  petsEnabled: false,

  init: async (userId: string) => {
    try {
      const theme = await loadTheme(userId)
      if (theme) {
        const saved = theme.activeThemeId
        const mode: ThemeMode = saved === 'dark' ? 'dark' : saved === 'light' ? 'light' : 'system'
        set({
          mode,
          background:  theme.background ?? DEFAULT_BACKGROUND,
          petsEnabled: theme.petsEnabled,
        })
        if (mode === 'system') attachSystemListener(() => get().applyToDOM())
      }
    } catch (err) {
      console.error('Failed to load theme from Supabase:', err)
    }
    get().applyToDOM()
  },

  setMode: (mode) => {
    set({ mode })
    if (mode === 'system') {
      attachSystemListener(() => get().applyToDOM())
    } else {
      detachSystemListener()
    }
    applyThemeVars(effectiveDark(mode) ? DARK : LIGHT)
  },

  toggleMode: () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light'
    get().setMode(next)
  },

  applyToDOM: () => {
    applyThemeVars(effectiveDark(get().mode) ? DARK : LIGHT)
  },

  setBackground:  (bg) => set({ background: bg }),
  setPetsEnabled: (enabled) => set({ petsEnabled: enabled }),
}))
