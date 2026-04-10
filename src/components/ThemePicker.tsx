import { useState } from 'react'
import { THEMES } from '../themes/presets'
import { useThemeStore } from '../store/theme'

export function ThemePicker() {
  const { activeThemeId, setTheme } = useThemeStore()
  const currentTheme = THEMES.find((t) => t.id === activeThemeId)
  const [mode, setMode] = useState<'light' | 'dark'>(currentTheme?.dark ? 'dark' : 'light')

  const filtered = THEMES.filter((t) => (mode === 'dark' ? t.dark : !t.dark))

  return (
    <div className="flex flex-col gap-3">
      {/* Light / Dark toggle */}
      <div
        className="flex rounded-lg p-0.5 gap-0.5"
        style={{ backgroundColor: 'var(--wt-surface)' }}
      >
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all capitalize"
            style={{
              backgroundColor: mode === m ? 'var(--wt-bg)' : 'transparent',
              color: mode === m ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((theme) => {
          const [bg, border, accent, text] = theme.previewColors
          const active = activeThemeId === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              title={theme.name}
              className="transition-all hover:scale-105 active:scale-95 rounded-lg overflow-hidden"
              style={{
                outline: 'none',
                backgroundColor: bg,
                boxShadow: active
                  ? `0 0 0 2px ${accent}, 0 4px 12px ${accent}40`
                  : `0 1px 3px rgba(0,0,0,0.12), inset 0 0 0 1px ${border}`,
              }}
            >
              <div style={{ height: 2, backgroundColor: accent }} />
              <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <div className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, backgroundColor: accent }} />
                  <div className="flex-1 rounded-full" style={{ height: 2, backgroundColor: text, opacity: 0.3 }} />
                </div>
                <div className="rounded-full" style={{ height: 2, backgroundColor: text, opacity: 0.15, width: '60%' }} />
                <span
                  className="text-[9px] mt-0.5 text-left truncate"
                  style={{ fontWeight: active ? 600 : 400, color: active ? text : `${text}99` }}
                >
                  {theme.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
