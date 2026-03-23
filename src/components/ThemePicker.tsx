import { THEMES } from '../themes/presets'
import { useThemeStore } from '../store/theme'

export function ThemePicker() {
  const { activeThemeId, setTheme } = useThemeStore()

  return (
    <div className="grid grid-cols-4 gap-2">
      {THEMES.map((theme) => {
        const [bg, border, accent, text] = theme.previewColors
        const active = activeThemeId === theme.id

        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            title={theme.name}
            className="flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            style={{ outline: 'none' }}
          >
            {/* Swatch */}
            <div
              className="w-full rounded-xl overflow-hidden transition-all"
              style={{
                height: 52,
                backgroundColor: bg,
                boxShadow: active
                  ? `0 0 0 2px ${accent}, 0 4px 12px ${accent}30`
                  : `0 1px 3px rgba(0,0,0,0.12), inset 0 0 0 1px ${border}`,
              }}
            >
              {/* Top accent bar */}
              <div style={{ height: 3, backgroundColor: accent }} />

              {/* Content area */}
              <div className="px-2 pt-1.5 flex flex-col gap-1">
                {/* Row with dot + line */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 6, height: 6, backgroundColor: accent }}
                  />
                  <div
                    className="flex-1 rounded-full"
                    style={{ height: 2, backgroundColor: text, opacity: 0.35 }}
                  />
                </div>
                {/* Two text lines */}
                <div
                  className="rounded-full"
                  style={{ height: 2, backgroundColor: text, opacity: 0.2, width: '100%' }}
                />
                <div
                  className="rounded-full"
                  style={{ height: 2, backgroundColor: text, opacity: 0.12, width: '70%' }}
                />
              </div>
            </div>

            {/* Name */}
            <span
              className="text-[10px] leading-none text-center transition-colors"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--wt-text)' : 'var(--wt-text-muted)',
              }}
            >
              {theme.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
