import { useThemeStore } from '../store/theme'
import { THEME_MAP } from '../themes/presets'

const LIGHT_ID = 'slate'
const DARK_ID  = 'slate-dark'

export function ThemePicker() {
  const { activeThemeId, setTheme } = useThemeStore()
  const isDark = THEME_MAP[activeThemeId]?.dark ?? false

  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ backgroundColor: 'var(--wt-surface)' }}
    >
      {([
        { label: 'Light', id: LIGHT_ID, dark: false },
        { label: 'Dark',  id: DARK_ID,  dark: true  },
      ] as const).map(({ label, id, dark }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className="flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all capitalize"
          style={{
            backgroundColor: isDark === dark ? 'var(--wt-bg)' : 'transparent',
            color:           isDark === dark ? 'var(--wt-text)' : 'var(--wt-text-muted)',
            boxShadow:       isDark === dark ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
