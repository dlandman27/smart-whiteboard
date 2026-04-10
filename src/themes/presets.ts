// ── Theme system ─────────────────────────────────────────────────────────────
//
// All widget colors are driven by CSS custom properties (--wt-*).
// Themes are generated from primary + complementary shade scales via
// buildThemeVars() in scale.ts. Every theme shares the same lightness and
// saturation curve — only the hue and accent colors change.
//
// Dark themes are calibrated against Dracula as the gold standard.

import { type Background } from '../constants/backgrounds'
import { buildThemeVars, type ScaleThemeInput } from './scale'

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

  // Status colors
  success: string
  info:    string
}

export interface Theme {
  id:            string
  name:          string
  emoji:         string
  dark:          boolean
  previewColors: [string, string, string, string]  // bg, border, accent, text
  background:    Background
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

// ── Theme builder helper ─────────────────────────────────────────────────────

function theme(
  id: string, name: string, emoji: string,
  bg: Background,
  previewColors: [string, string, string, string],
  input: ScaleThemeInput,
): Theme {
  return {
    id, name, emoji,
    dark: input.dark,
    previewColors,
    background: bg,
    vars: buildThemeVars(input),
  }
}

// ── Preset themes ─────────────────────────────────────────────────────────────
// All themes use buildThemeVars with Dracula's saturation profile (s:27 dark,
// s:30-40 light) as the baseline. Only hue, accent, and background change.

export const THEMES: Theme[] = [
  // ── Light themes ─────────────────────────────────────────────────────────

  theme('minimal', 'Minimal', '○',
    { label: 'White', bg: '#ffffff', dot: '#e2e8f0' },
    ['#ffffff', '#e7e5e4', '#3b82f6', '#1c1917'],
    { primaryHue: 30, primarySat: 12, complementaryHue: 210, complementarySat: 10, dark: false,
      accent: '#3b82f6', accentText: '#ffffff' }),

  theme('slate', 'Slate', '▣',
    { label: 'Slate', bg: '#f1f5f9', dot: '#cbd5e1' },
    ['#f8fafc', '#cbd5e1', '#3b82f6', '#0f172a'],
    { primaryHue: 215, primarySat: 30, complementaryHue: 35, complementarySat: 20, dark: false,
      accent: '#3b82f6', accentText: '#ffffff' }),

  theme('paper', 'Paper', '▪',
    { label: 'Parchment', bg: '#f5f0eb', dot: '#c9bfb5' },
    ['#faf8f5', '#e0d8cc', '#5c4a32', '#2d2016'],
    { primaryHue: 30, primarySat: 25, complementaryHue: 210, complementarySat: 15, dark: false,
      accent: '#5c4a32', accentText: '#faf8f5', danger: '#c0392b',
      success: '#4a7c3f', info: '#5c6a8a' }),

  theme('amber', 'Amber', '◇',
    { label: 'Sand', bg: '#fdf6e3', dot: '#d4c5a9' },
    ['#fffbeb', '#fde68a', '#d97706', '#451a03'],
    { primaryHue: 42, primarySat: 45, complementaryHue: 222, complementarySat: 20, dark: false,
      accent: '#d97706', accentText: '#ffffff',
      success: '#15803d', info: '#b45309' }),

  theme('rose', 'Rose', '◈',
    { label: 'Blush', bg: '#fff0f3', dot: '#fecdd3' },
    ['#fff5f7', '#fecdd3', '#e11d48', '#4c0519'],
    { primaryHue: 345, primarySat: 40, complementaryHue: 165, complementarySat: 15, dark: false,
      accent: '#e11d48', accentText: '#ffffff',
      success: '#15803d', info: '#be123c' }),

  theme('sage', 'Sage', '◆',
    { label: 'Meadow', bg: '#edf2ed', dot: '#c6d6c6' },
    ['#f4f7f4', '#c6d6c6', '#4a7c59', '#1a2e1a'],
    { primaryHue: 120, primarySat: 20, complementaryHue: 300, complementarySat: 10, dark: false,
      accent: '#4a7c59', accentText: '#ffffff',
      info: '#2d5a6a' }),

  theme('sunset', 'Sunset', '🌇',
    { label: 'Warm Sand', bg: '#fff3e8', dot: '#f4c9a0' },
    ['#fff8f2', '#f4c9a0', '#e8640a', '#3d1f0a'],
    { primaryHue: 25, primarySat: 35, complementaryHue: 205, complementarySat: 15, dark: false,
      accent: '#e8640a', accentText: '#ffffff', danger: '#e03030',
      success: '#15803d', info: '#b45309' }),

  theme('lemon', 'Lemon', '🍋',
    { label: 'Lemon Drop', bg: '#f8f7ee', dot: '#e4e0c0' },
    ['#f9f9f6', '#dddbc5', '#a69215', '#3a3510'],
    { primaryHue: 55, primarySat: 35, complementaryHue: 235, complementarySat: 15, dark: false,
      accent: '#a69215', accentText: '#ffffff',
      success: '#4a7c3f', info: '#7a6c10' }),

  theme('teal', 'Teal', '🌊',
    { label: 'Seafoam', bg: '#eef7f7', dot: '#c0dede' },
    ['#f6f9f9', '#c7dbdb', '#0d9488', '#0f3d3a'],
    { primaryHue: 180, primarySat: 30, complementaryHue: 0, complementarySat: 15, dark: false,
      accent: '#0d9488', accentText: '#ffffff',
      info: '#0891b2' }),

  theme('lavender', 'Lavender', '🪻',
    { label: 'Soft Lilac', bg: '#f3f0f8', dot: '#d8d0e8' },
    ['#f7f6f8', '#d1c8da', '#7c3aed', '#2d1a4a'],
    { primaryHue: 270, primarySat: 25, complementaryHue: 90, complementarySat: 12, dark: false,
      accent: '#7c3aed', accentText: '#ffffff',
      info: '#6d28d9' }),

  // ── Dark themes (Dracula-calibrated: s:27 baseline) ──────────────────────

  theme('dracula', 'Dracula', '🧛',
    { label: 'Dracula', bg: '#1e1f29', dot: '#282a36' },
    ['#282a36', '#44475a', '#bd93f9', '#f8f8f2'],
    { primaryHue: 231, primarySat: 27, complementaryHue: 51, complementarySat: 15, dark: true,
      accent: '#bd93f9', accentText: '#282a36',
      danger: '#ff5555', success: '#50fa7b', info: '#8be9fd',
      clockSecond: '#ff79c6' }),

  theme('midnight', 'Midnight', '◉',
    { label: 'Charcoal', bg: '#22222a', dot: '#2e2e38' },
    ['#1e1e24', '#35353e', '#a0a0b0', '#f0f0f5'],
    { primaryHue: 240, primarySat: 8, complementaryHue: 60, complementarySat: 6, dark: true,
      accent: '#a0a0b0', accentText: '#1e1e24' }),

  theme('ocean', 'Ocean', '◍',
    { label: 'Midnight', bg: '#1a2c44', dot: '#25405e' },
    ['#142030', '#1e3858', '#38bdf8', '#bae6fd'],
    { primaryHue: 210, primarySat: 27, complementaryHue: 30, complementarySat: 15, dark: true,
      accent: '#38bdf8', accentText: '#0a1828',
      success: '#34d399' }),

  theme('forest', 'Forest', '◆',
    { label: 'Deep Forest', bg: '#1e3420', dot: '#284828' },
    ['#182818', '#284828', '#22c55e', '#d4f5d4'],
    { primaryHue: 135, primarySat: 27, complementaryHue: 315, complementarySat: 12, dark: true,
      accent: '#22c55e', accentText: '#0a150a',
      info: '#4ade80' }),

  theme('dusk', 'Dusk', '◉',
    { label: 'Twilight', bg: '#221e38', dot: '#302a50' },
    ['#1e1a30', '#383260', '#a78bfa', '#ede9fe'],
    { primaryHue: 265, primarySat: 27, complementaryHue: 85, complementarySat: 12, dark: true,
      accent: '#a78bfa', accentText: '#1e1a30',
      success: '#a78bfa', info: '#818cf8' }),

  theme('espresso', 'Espresso', '▪',
    { label: 'Roast', bg: '#2c2218', dot: '#3e3020' },
    ['#28201a', '#443828', '#d97706', '#f5e6d0'],
    { primaryHue: 30, primarySat: 27, complementaryHue: 210, complementarySat: 15, dark: true,
      accent: '#d97706', accentText: '#28201a',
      success: '#a3724a' }),

  theme('carbon', 'Carbon', '◼',
    { label: 'Ink', bg: '#222a34', dot: '#303a48' },
    ['#1e2530', '#353e4a', '#58a6ff', '#e6edf3'],
    { primaryHue: 215, primarySat: 27, complementaryHue: 35, complementarySat: 12, dark: true,
      accent: '#58a6ff', accentText: '#1e2530',
      danger: '#f85149', success: '#3fb950' }),

  theme('terminal', 'Terminal', '▶',
    { label: 'Void', bg: '#1c241c', dot: '#283028' },
    ['#181e18', '#283028', '#00ff41', '#00cc33'],
    { primaryHue: 120, primarySat: 27, complementaryHue: 300, complementarySat: 10, dark: true,
      accent: '#00ff41', accentText: '#0a140a',
      danger: '#ff0000', success: '#00ff41', info: '#00cc33',
      clockSecond: '#00cc33' }),

  theme('volcanic', 'Volcanic', '🌋',
    { label: 'Ash Black', bg: '#2c1e18', dot: '#3e2820' },
    ['#281a18', '#44281e', '#ff5733', '#ffd0c0'],
    { primaryHue: 10, primarySat: 27, complementaryHue: 190, complementarySat: 12, dark: true,
      accent: '#ff5733', accentText: '#ffffff',
      danger: '#ff3333', info: '#f0a060' }),

  theme('midnight-rose', 'Midnight Rose', '🌹',
    { label: 'Deep Rose', bg: '#281e30', dot: '#3a2840' },
    ['#241a28', '#3e2840', '#e879a0', '#f0d0e0'],
    { primaryHue: 320, primarySat: 27, complementaryHue: 140, complementarySat: 12, dark: true,
      accent: '#e879a0', accentText: '#241a28',
      success: '#e879a0', info: '#c084fc' }),

  theme('plum-cyan', 'Plum + Cyan', '🫐',
    { label: 'Deep Plum', bg: '#241c40', dot: '#342850' },
    ['#201838', '#342850', '#00e5cc', '#e0d0f8'],
    { primaryHue: 270, primarySat: 27, complementaryHue: 175, complementarySat: 15, dark: true,
      accent: '#00e5cc', accentText: '#201838',
      info: '#818cf8' }),

  theme('golden', 'Golden', '✨',
    { label: 'Dark Gold', bg: '#28261a', dot: '#383520' },
    ['#282720', '#48452c', '#eab308', '#fef3c7'],
    { primaryHue: 50, primarySat: 27, complementaryHue: 230, complementarySat: 15, dark: true,
      accent: '#eab308', accentText: '#1a1910',
      success: '#84cc16', info: '#eab308' }),

  theme('deep-teal', 'Deep Teal', '🐚',
    { label: 'Deep Sea', bg: '#1e2c2c', dot: '#283a3a' },
    ['#1e2929', '#3a5555', '#2dd4bf', '#ccf0ea'],
    { primaryHue: 180, primarySat: 27, complementaryHue: 0, complementarySat: 12, dark: true,
      accent: '#2dd4bf', accentText: '#0f1e1e',
      success: '#2dd4bf', info: '#22d3ee' }),

  theme('aurora', 'Aurora', '🌌',
    { label: 'Aurora', bg: '#1a1a24', dot: '#252530', pattern: 'gradient' as const, gradientTo: '#1a2428' },
    ['#222228', '#3e3e48', '#c084fc', '#f0eaf8'],
    { primaryHue: 240, primarySat: 10, complementaryHue: 60, complementarySat: 8, dark: true,
      accent: '#c084fc', accentText: '#1a1a24',
      danger: '#fb7185', success: '#34d399', info: '#38bdf8',
      clockSecond: '#fb7185' }),
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
  success:            '--wt-success',
  info:               '--wt-info',
}

export function applyThemeVars(vars: ThemeVars) {
  const root = document.documentElement
  root.classList.add('theme-transitioning')
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, vars[key as keyof ThemeVars])
  }
  setTimeout(() => root.classList.remove('theme-transitioning'), 450)
}
