import { useThemeStore } from '../store/theme'

export function ThemePicker() {
  const { mode, setMode } = useThemeStore()

  return (
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
            color:           mode === m ? 'var(--wt-text)' : 'var(--wt-text-muted)',
            boxShadow:       mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
