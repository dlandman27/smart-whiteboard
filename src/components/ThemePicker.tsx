import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { THEMES, VAR_LABELS, type ThemeVars } from '../themes/presets'
import { useThemeStore } from '../store/theme'

// Color vars shown in the advanced customizer, in display order
const CUSTOM_VARS: (keyof ThemeVars)[] = [
  'widgetBg',
  'widgetBorder',
  'widgetBorderActive',
  'textPrimary',
  'textMuted',
  'surfaceHover',
  'accent',
  'danger',
  'actionBg',
  'clockFaceFill',
  'clockHands',
  'clockSecond',
  'noteDefaultBg',
]

// Vars that are shadows/filters — not color-pickable
const NON_COLOR_VARS = new Set<keyof ThemeVars>([
  'shadowSm', 'shadowMd', 'shadowLg', 'backdropFilter',
  'accentText', 'surfaceSubtle', 'surfaceDanger',
  'actionBorder', 'settingsBg', 'settingsBorder', 'settingsDivider',
  'settingsLabel', 'scrollThumb',
  'clockFaceStroke', 'clockTickMajor', 'clockTickMinor', 'clockCenter',
])

function ThemeCard({ theme, active, onSelect }: {
  theme: typeof THEMES[number]
  active: boolean
  onSelect: () => void
}) {
  const [bg, border, accent, text] = theme.previewColors

  return (
    <button
      onClick={onSelect}
      title={theme.name}
      className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
      style={{
        border: active ? `2px solid ${accent}` : '2px solid transparent',
        backgroundColor: active ? `${accent}18` : 'var(--wt-surface-hover)',
      }}
    >
      {/* Mini widget preview */}
      <div
        className="w-full h-10 rounded-lg flex items-center justify-center gap-1 overflow-hidden"
        style={{ backgroundColor: bg, border: `1px solid ${border}` }}
      >
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
        <div className="flex flex-col gap-0.5">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: text, opacity: 0.6 }} />
          <div className="w-5 h-1 rounded-full" style={{ backgroundColor: text, opacity: 0.3 }} />
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--wt-text)' }}>
        {theme.name}
      </span>
      {active && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
    </button>
  )
}

export function ThemePicker() {
  const { activeThemeId, customOverrides, setTheme, setOverride, clearOverrides } = useThemeStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const activeTheme = THEMES.find((t) => t.id === activeThemeId)
  const hasOverrides = Object.keys(customOverrides).length > 0

  return (
    <div className="space-y-3">
      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={activeThemeId === theme.id && !hasOverrides}
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </div>

      {/* Quick accent color */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>Accent color</span>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border-2"
            style={{
              backgroundColor: customOverrides.accent ?? activeTheme?.vars.accent ?? '#3b82f6',
              borderColor: 'var(--wt-border)',
            }}
          />
          <input
            type="color"
            value={customOverrides.accent ?? activeTheme?.vars.accent ?? '#3b82f6'}
            onChange={(e) => setOverride('accent', e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
            title="Pick accent color"
          />
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors"
        style={{
          color: 'var(--wt-text-muted)',
          backgroundColor: showAdvanced ? 'var(--wt-surface-hover)' : 'transparent',
        }}
      >
        <span className="text-xs font-medium">Advanced customization</span>
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showAdvanced && (
        <div className="space-y-2">
          {CUSTOM_VARS.filter((k) => !NON_COLOR_VARS.has(k)).map((key) => {
            const label = VAR_LABELS[key] ?? key
            const currentValue = (customOverrides[key] as string | undefined)
              ?? activeTheme?.vars[key] ?? '#000000'

            // Skip non-CSS-color values (gradients, etc.)
            const isPickable = /^(#|rgb|rgba|hsl|hsla)/.test(currentValue)
            if (!isPickable) return null

            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs flex-1" style={{ color: 'var(--wt-text-muted)' }}>
                  {label}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: currentValue, borderColor: 'var(--wt-border)' }}
                  />
                  <input
                    type="color"
                    value={currentValue.startsWith('rgba') ? '#888888' : currentValue}
                    onChange={(e) => setOverride(key, e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                </div>
              </div>
            )
          })}

          {/* Reset overrides */}
          {hasOverrides && (
            <button
              onClick={clearOverrides}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-colors mt-1"
              style={{
                color: 'var(--wt-danger)',
                backgroundColor: 'var(--wt-surface-danger)',
              }}
            >
              <RotateCcw size={11} />
              Reset to preset
            </button>
          )}
        </div>
      )}
    </div>
  )
}
