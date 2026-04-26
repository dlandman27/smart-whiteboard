import { useThemeStore, type ThemeMode } from '../store/theme'

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'Auto'   },
]

export function ThemePicker() {
  const { mode, setMode } = useThemeStore()

  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ backgroundColor: 'var(--wt-surface)' }}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setMode(opt.value)}
          className="flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all"
          style={{
            backgroundColor: mode === opt.value ? 'var(--wt-bg)' : 'transparent',
            color:           mode === opt.value ? 'var(--wt-text)' : 'var(--wt-text-muted)',
            boxShadow:       mode === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
