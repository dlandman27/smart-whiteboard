// ── Theme system ─────────────────────────────────────────────────────────────
//
// All widget colors are driven by CSS custom properties (--wt-*).
// Themes define the full set of vars. The active theme + any custom overrides
// are applied to :root by the theme store applier.

export interface ThemeVars {
  // Widget frame
  widgetBg:           string
  widgetBorder:       string
  widgetBorderActive: string
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

  // Accent + danger
  accent:      string
  accentText:  string
  danger:      string

  // Action panel (floating controls)
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

export interface Theme {
  id:            string
  name:          string
  emoji:         string
  dark:          boolean
  previewColors: [string, string, string, string]  // bg, border, accent, text
  vars:          ThemeVars
}

// ── CSS var map ───────────────────────────────────────────────────────────────

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

// ── Preset themes ─────────────────────────────────────────────────────────────

export const THEMES: Theme[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    emoji: '○',
    dark: false,
    previewColors: ['#ffffff', '#e7e5e4', '#3b82f6', '#1c1917'],
    vars: {
      widgetBg:           '#ffffff',
      widgetBorder:       '#e7e5e4',
      widgetBorderActive: '#d6d3d1',
      shadowSm:           '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
      shadowMd:           '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
      shadowLg:           '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.08)',
      backdropFilter:     'none',
      textPrimary:        '#1c1917',
      textMuted:          '#a8a29e',
      surfaceSubtle:      '#fafaf9',
      surfaceHover:       '#f5f5f4',
      surfaceDanger:      '#fef2f2',
      accent:             '#3b82f6',
      accentText:         '#ffffff',
      danger:             '#f87171',
      actionBg:           '#ffffff',
      actionBorder:       '#e7e5e4',
      settingsBg:         '#ffffff',
      settingsBorder:     '#e7e5e4',
      settingsDivider:    '#f5f5f4',
      settingsLabel:      '#a8a29e',
      scrollThumb:        '#d6d3d1',
      clockFaceFill:      '#ffffff',
      clockFaceStroke:    '#e7e5e4',
      clockTickMajor:     '#a8a29e',
      clockTickMinor:     '#d6d3d1',
      clockHands:         '#1c1917',
      clockSecond:        '#ef4444',
      clockCenter:        '#1c1917',
      noteDefaultBg:      '#fef9c3',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '◉',
    dark: true,
    previewColors: ['#141414', '#2a2a2a', '#a3a3a3', '#f5f5f5'],
    vars: {
      widgetBg:           '#141414',
      widgetBorder:       '#2a2a2a',
      widgetBorderActive: '#3d3d3d',
      shadowSm:           '0 1px 3px rgba(0,0,0,0.5)',
      shadowMd:           '0 4px 16px rgba(0,0,0,0.6)',
      shadowLg:           '0 20px 48px rgba(0,0,0,0.8)',
      backdropFilter:     'none',
      textPrimary:        '#f5f5f5',
      textMuted:          '#737373',
      surfaceSubtle:      '#1a1a1a',
      surfaceHover:       '#262626',
      surfaceDanger:      '#2a1515',
      accent:             '#a3a3a3',
      accentText:         '#000000',
      danger:             '#f87171',
      actionBg:           '#1a1a1a',
      actionBorder:       '#2a2a2a',
      settingsBg:         '#1a1a1a',
      settingsBorder:     '#2a2a2a',
      settingsDivider:    '#222222',
      settingsLabel:      '#525252',
      scrollThumb:        '#404040',
      clockFaceFill:      '#1a1a1a',
      clockFaceStroke:    '#2a2a2a',
      clockTickMajor:     '#525252',
      clockTickMinor:     '#333333',
      clockHands:         '#e5e5e5',
      clockSecond:        '#f87171',
      clockCenter:        '#e5e5e5',
      noteDefaultBg:      '#262626',
    },
  },
  {
    id: 'stark',
    name: 'Stark',
    emoji: '⬡',
    dark: true,
    previewColors: ['#070c14', '#1a4a70', '#00b4ff', '#c8e8ff'],
    vars: {
      widgetBg:           '#070c14',
      widgetBorder:       '#0d2035',
      widgetBorderActive: '#1a4a70',
      shadowSm:           '0 1px 4px rgba(0,180,255,0.1)',
      shadowMd:           '0 4px 16px rgba(0,180,255,0.15)',
      shadowLg:           '0 20px 48px rgba(0,180,255,0.2), 0 0 0 1px rgba(0,180,255,0.05)',
      backdropFilter:     'none',
      textPrimary:        '#c8e8ff',
      textMuted:          '#4a7a9b',
      surfaceSubtle:      '#0a1520',
      surfaceHover:       '#0d2035',
      surfaceDanger:      '#1f0a0a',
      accent:             '#00b4ff',
      accentText:         '#000a14',
      danger:             '#ff4444',
      actionBg:           '#0a1520',
      actionBorder:       '#1a4a70',
      settingsBg:         '#0a1520',
      settingsBorder:     '#1a4a70',
      settingsDivider:    '#0d2035',
      settingsLabel:      '#4a7a9b',
      scrollThumb:        '#1a4a70',
      clockFaceFill:      '#070c14',
      clockFaceStroke:    '#1a4a70',
      clockTickMajor:     '#1a6080',
      clockTickMinor:     '#0d2a40',
      clockHands:         '#00b4ff',
      clockSecond:        '#ff4444',
      clockCenter:        '#00b4ff',
      noteDefaultBg:      '#0a1520',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    emoji: '◈',
    dark: false,
    previewColors: ['#fff5f7', '#fecdd3', '#e11d48', '#4c0519'],
    vars: {
      widgetBg:           '#fff5f7',
      widgetBorder:       '#fecdd3',
      widgetBorderActive: '#fda4af',
      shadowSm:           '0 1px 3px rgba(225,29,72,0.07)',
      shadowMd:           '0 4px 12px rgba(225,29,72,0.09)',
      shadowLg:           '0 20px 40px rgba(225,29,72,0.13)',
      backdropFilter:     'none',
      textPrimary:        '#4c0519',
      textMuted:          '#fb7185',
      surfaceSubtle:      '#fff1f2',
      surfaceHover:       '#ffe4e6',
      surfaceDanger:      '#ffe4e6',
      accent:             '#e11d48',
      accentText:         '#ffffff',
      danger:             '#e11d48',
      actionBg:           '#fff5f7',
      actionBorder:       '#fecdd3',
      settingsBg:         '#fff5f7',
      settingsBorder:     '#fecdd3',
      settingsDivider:    '#ffe4e6',
      settingsLabel:      '#fda4af',
      scrollThumb:        '#fda4af',
      clockFaceFill:      '#fff5f7',
      clockFaceStroke:    '#fecdd3',
      clockTickMajor:     '#fda4af',
      clockTickMinor:     '#fecdd3',
      clockHands:         '#4c0519',
      clockSecond:        '#e11d48',
      clockCenter:        '#4c0519',
      noteDefaultBg:      '#fff1f2',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '◆',
    dark: true,
    previewColors: ['#0f1a0f', '#1a3a1a', '#22c55e', '#d4f5d4'],
    vars: {
      widgetBg:           '#0f1a0f',
      widgetBorder:       '#1a3a1a',
      widgetBorderActive: '#2a5a2a',
      shadowSm:           '0 1px 3px rgba(0,0,0,0.5)',
      shadowMd:           '0 4px 16px rgba(0,80,0,0.2)',
      shadowLg:           '0 20px 48px rgba(0,80,0,0.3)',
      backdropFilter:     'none',
      textPrimary:        '#d4f5d4',
      textMuted:          '#4a7a4a',
      surfaceSubtle:      '#0d180d',
      surfaceHover:       '#162616',
      surfaceDanger:      '#1a0f0f',
      accent:             '#22c55e',
      accentText:         '#0a150a',
      danger:             '#f87171',
      actionBg:           '#0d180d',
      actionBorder:       '#1a3a1a',
      settingsBg:         '#0d180d',
      settingsBorder:     '#1a3a1a',
      settingsDivider:    '#141f14',
      settingsLabel:      '#3a6a3a',
      scrollThumb:        '#2a5a2a',
      clockFaceFill:      '#0f1a0f',
      clockFaceStroke:    '#1a3a1a',
      clockTickMajor:     '#2a5a2a',
      clockTickMinor:     '#1a3a1a',
      clockHands:         '#a3e8a3',
      clockSecond:        '#22c55e',
      clockCenter:        '#a3e8a3',
      noteDefaultBg:      '#0d180d',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    emoji: '◇',
    dark: false,
    previewColors: ['#fffbeb', '#fde68a', '#d97706', '#451a03'],
    vars: {
      widgetBg:           '#fffbeb',
      widgetBorder:       '#fde68a',
      widgetBorderActive: '#fbbf24',
      shadowSm:           '0 1px 3px rgba(180,120,0,0.08)',
      shadowMd:           '0 4px 12px rgba(180,120,0,0.12)',
      shadowLg:           '0 20px 40px rgba(180,120,0,0.16)',
      backdropFilter:     'none',
      textPrimary:        '#451a03',
      textMuted:          '#d97706',
      surfaceSubtle:      '#fef3c7',
      surfaceHover:       '#fde68a',
      surfaceDanger:      '#fef2f2',
      accent:             '#d97706',
      accentText:         '#ffffff',
      danger:             '#ef4444',
      actionBg:           '#fffbeb',
      actionBorder:       '#fde68a',
      settingsBg:         '#fffbeb',
      settingsBorder:     '#fde68a',
      settingsDivider:    '#fef3c7',
      settingsLabel:      '#b45309',
      scrollThumb:        '#fbbf24',
      clockFaceFill:      '#fffbeb',
      clockFaceStroke:    '#fde68a',
      clockTickMajor:     '#d97706',
      clockTickMinor:     '#fde68a',
      clockHands:         '#451a03',
      clockSecond:        '#d97706',
      clockCenter:        '#451a03',
      noteDefaultBg:      '#fef3c7',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    emoji: '▣',
    dark: false,
    previewColors: ['#f8fafc', '#cbd5e1', '#3b82f6', '#0f172a'],
    vars: {
      widgetBg:           '#f8fafc',
      widgetBorder:       '#cbd5e1',
      widgetBorderActive: '#94a3b8',
      shadowSm:           '0 1px 3px rgba(15,23,42,0.07)',
      shadowMd:           '0 4px 12px rgba(15,23,42,0.1)',
      shadowLg:           '0 20px 40px rgba(15,23,42,0.14)',
      backdropFilter:     'none',
      textPrimary:        '#0f172a',
      textMuted:          '#94a3b8',
      surfaceSubtle:      '#f1f5f9',
      surfaceHover:       '#e2e8f0',
      surfaceDanger:      '#fef2f2',
      accent:             '#3b82f6',
      accentText:         '#ffffff',
      danger:             '#ef4444',
      actionBg:           '#f8fafc',
      actionBorder:       '#cbd5e1',
      settingsBg:         '#f8fafc',
      settingsBorder:     '#cbd5e1',
      settingsDivider:    '#e2e8f0',
      settingsLabel:      '#94a3b8',
      scrollThumb:        '#cbd5e1',
      clockFaceFill:      '#f8fafc',
      clockFaceStroke:    '#cbd5e1',
      clockTickMajor:     '#94a3b8',
      clockTickMinor:     '#cbd5e1',
      clockHands:         '#0f172a',
      clockSecond:        '#3b82f6',
      clockCenter:        '#0f172a',
      noteDefaultBg:      '#f1f5f9',
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    emoji: '◎',
    dark: false,
    previewColors: ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.45)', '#6366f1', '#1c1917'],
    vars: {
      widgetBg:           'rgba(255,255,255,0.72)',
      widgetBorder:       'rgba(255,255,255,0.5)',
      widgetBorderActive: 'rgba(255,255,255,0.85)',
      shadowSm:           '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
      shadowMd:           '0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
      shadowLg:           '0 24px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
      backdropFilter:     'blur(14px) saturate(1.6)',
      textPrimary:        '#1c1917',
      textMuted:          '#78716c',
      surfaceSubtle:      'rgba(255,255,255,0.3)',
      surfaceHover:       'rgba(255,255,255,0.55)',
      surfaceDanger:      'rgba(254,242,242,0.8)',
      accent:             '#6366f1',
      accentText:         '#ffffff',
      danger:             '#ef4444',
      actionBg:           'rgba(255,255,255,0.82)',
      actionBorder:       'rgba(255,255,255,0.55)',
      settingsBg:         'rgba(255,255,255,0.88)',
      settingsBorder:     'rgba(255,255,255,0.5)',
      settingsDivider:    'rgba(255,255,255,0.35)',
      settingsLabel:      '#78716c',
      scrollThumb:        'rgba(100,100,100,0.25)',
      clockFaceFill:      'rgba(255,255,255,0.6)',
      clockFaceStroke:    'rgba(200,200,200,0.5)',
      clockTickMajor:     'rgba(100,100,100,0.55)',
      clockTickMinor:     'rgba(150,150,150,0.35)',
      clockHands:         '#1c1917',
      clockSecond:        '#6366f1',
      clockCenter:        '#1c1917',
      noteDefaultBg:      'rgba(255,249,195,0.75)',
    },
  },
]

export const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t]))

export const CSS_VAR_MAP: Record<keyof ThemeVars, string> = {
  widgetBg:           '--wt-bg',
  widgetBorder:       '--wt-border',
  widgetBorderActive: '--wt-border-active',
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
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, vars[key as keyof ThemeVars])
  }
}
