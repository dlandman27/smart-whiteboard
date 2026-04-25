export interface ThemeVars {
  // Widget frame
  widgetBg:           string
  widgetBorder:       string
  widgetBorderActive: string
  widgetHighlight:    string
  widgetRestBorder:   string
  shadowSm:           string
  shadowMd:           string
  shadowLg:           string
  backdropFilter:     string

  // Text
  textPrimary: string
  textMuted:   string

  // Surfaces
  surfaceSubtle: string
  surfaceHover:  string
  surfaceDanger: string

  // Accent + semantic
  accent:      string
  accentText:  string
  danger:      string
  success:     string
  info:        string

  // Action panel
  actionBg:     string
  actionBorder: string

  // Settings panel
  settingsBg:      string
  settingsBorder:  string
  settingsDivider: string
  settingsLabel:   string
  scrollThumb:     string

  // Clock widget
  clockFaceFill:   string
  clockFaceStroke: string
  clockTickMajor:  string
  clockTickMinor:  string
  clockHands:      string
  clockSecond:     string
  clockCenter:     string

  // Note widget
  noteDefaultBg: string
}

export const VAR_LABELS: Partial<Record<keyof ThemeVars, string>> = {
  widgetBg:           'Widget Background',
  widgetBorder:       'Border',
  widgetBorderActive: 'Border (Active)',
  textPrimary:        'Text',
  textMuted:          'Text Muted',
  surfaceHover:       'Hover Surface',
  accent:             'Accent Color',
  danger:             'Danger Color',
  actionBg:           'Action Panel BG',
  clockFaceFill:      'Clock Face',
  clockHands:         'Clock Hands',
  clockSecond:        'Clock Second Hand',
  noteDefaultBg:      'Note Default BG',
}

export const CSS_VAR_MAP: Record<keyof ThemeVars, string> = {
  widgetBg:           '--wt-bg',
  widgetBorder:       '--wt-border',
  widgetBorderActive: '--wt-border-active',
  widgetHighlight:    '--wt-widget-highlight',
  widgetRestBorder:   '--wt-widget-rest-border',
  shadowSm:           '--wt-shadow-sm',
  shadowMd:           '--wt-shadow-md',
  shadowLg:           '--wt-shadow-lg',
  backdropFilter:     '--wt-backdrop',
  textPrimary:        '--wt-text',
  textMuted:          '--wt-text-muted',
  surfaceSubtle:      '--wt-surface',
  surfaceHover:       '--wt-surface-hover',
  surfaceDanger:      '--wt-surface-danger',
  accent:             '--wt-accent',
  accentText:         '--wt-accent-text',
  danger:             '--wt-danger',
  success:            '--wt-success',
  info:               '--wt-info',
  actionBg:           '--wt-action-bg',
  actionBorder:       '--wt-action-border',
  settingsBg:         '--wt-settings-bg',
  settingsBorder:     '--wt-settings-border',
  settingsDivider:    '--wt-settings-divider',
  settingsLabel:      '--wt-settings-label',
  scrollThumb:        '--wt-scroll-thumb',
  clockFaceFill:      '--wt-clock-face',
  clockFaceStroke:    '--wt-clock-stroke',
  clockTickMajor:     '--wt-clock-tick-major',
  clockTickMinor:     '--wt-clock-tick-minor',
  clockHands:         '--wt-clock-hands',
  clockSecond:        '--wt-clock-second',
  clockCenter:        '--wt-clock-center',
  noteDefaultBg:      '--wt-note-bg',
}

export function applyThemeVars(vars: ThemeVars) {
  const root = document.documentElement
  root.classList.add('theme-transitioning')
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, vars[key as keyof ThemeVars])
  }
  setTimeout(() => root.classList.remove('theme-transitioning'), 450)
}
