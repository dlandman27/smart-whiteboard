import { useThemeStore } from '../store/theme'
import { upsertTheme } from './db'

let unsub: (() => void) | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function startThemeSync(userId: string) {
  stopThemeSync()

  unsub = useThemeStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      upsertTheme(userId, {
        activeThemeId:   state.activeThemeId,
        customOverrides: state.customOverrides as Record<string, string>,
        customTheme:     state.customTheme as Record<string, string> | null,
        background:      state.background,
        petsEnabled:     state.petsEnabled,
      })
    }, 300)
  })
}

export function stopThemeSync() {
  unsub?.()
  unsub = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}
