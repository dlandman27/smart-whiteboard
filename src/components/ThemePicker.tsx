import { THEMES } from '../themes/presets'
import { useThemeStore } from '../store/theme'

function ThemeSection({ title, themes, activeThemeId, onSelect }: {
  title: string
  themes: typeof THEMES
  activeThemeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--wt-text-muted)' }}>
        {title}
      </p>
      <div className="grid grid-cols-6 gap-2">
        {themes.map((theme) => {
          const [bg, border, accent, text] = theme.previewColors
          const active = activeThemeId === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              title={theme.name}
              className="flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              style={{ outline: 'none' }}
            >
              <div
                className="w-full rounded-xl overflow-hidden transition-all"
                style={{
                  height: 48,
                  backgroundColor: bg,
                  boxShadow: active
                    ? `0 0 0 2px ${accent}, 0 4px 12px ${accent}40`
                    : `0 1px 3px rgba(0,0,0,0.12), inset 0 0 0 1px ${border}`,
                }}
              >
                <div style={{ height: 3, backgroundColor: accent }} />
                <div className="px-1.5 pt-1 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <div className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, backgroundColor: accent }} />
                    <div className="flex-1 rounded-full" style={{ height: 2, backgroundColor: text, opacity: 0.35 }} />
                  </div>
                  <div className="rounded-full" style={{ height: 2, backgroundColor: text, opacity: 0.2 }} />
                  <div className="rounded-full" style={{ height: 2, backgroundColor: text, opacity: 0.12, width: '70%' }} />
                </div>
              </div>
              <span
                className="text-[9px] leading-none text-center transition-colors w-full truncate"
                style={{ fontWeight: active ? 600 : 400, color: active ? 'var(--wt-text)' : 'var(--wt-text-muted)' }}
              >
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ThemePicker() {
  const { activeThemeId, setTheme } = useThemeStore()
  const light = THEMES.filter((t) => !t.dark)
  const dark  = THEMES.filter((t) => t.dark)

  return (
    <div className="flex flex-col gap-4">
      <ThemeSection title="Light" themes={light} activeThemeId={activeThemeId} onSelect={setTheme} />
      <ThemeSection title="Dark"  themes={dark}  activeThemeId={activeThemeId} onSelect={setTheme} />
    </div>
  )
}
