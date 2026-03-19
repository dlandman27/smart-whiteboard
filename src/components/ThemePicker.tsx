import { THEMES } from '../themes/presets'
import { useThemeStore } from '../store/theme'

export function ThemePicker() {
  const { activeThemeId, setTheme } = useThemeStore()

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {THEMES.map((theme) => {
        const [bg, border, accent, text] = theme.previewColors
        const active = activeThemeId === theme.id

        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            title={theme.name}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 transition-all"
            style={{ width: 56 }}
          >
            {/* Swatch */}
            <div
              className="w-full rounded-xl overflow-hidden transition-all"
              style={{
                height: 48,
                backgroundColor: bg,
                border: active ? `2px solid ${accent}` : `2px solid ${border}`,
                boxShadow: active ? `0 0 0 2px ${accent}40` : 'none',
              }}
            >
              {/* Mini content preview */}
              <div className="w-full h-full flex flex-col justify-center items-center gap-1 px-1.5">
                <div className="w-full flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                  <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: text, opacity: 0.4 }} />
                </div>
                <div className="w-full flex flex-col gap-0.5">
                  <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: text, opacity: 0.25 }} />
                  <div className="w-3/4 h-0.5 rounded-full" style={{ backgroundColor: text, opacity: 0.15 }} />
                </div>
              </div>
            </div>

            {/* Name */}
            <span
              className="text-[10px] font-medium leading-none"
              style={{ color: active ? 'var(--wt-text)' : 'var(--wt-text-muted)' }}
            >
              {theme.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
