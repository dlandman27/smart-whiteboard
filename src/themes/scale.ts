// ── Shade scale generator ────────────────────────────────────────────────────
//
// Generates 50–900 shade scales from a hue + saturation, then maps those
// scales to ThemeVars for consistent lightness/saturation across all themes.
//
// Primary scale:       drives widget backgrounds, borders, surfaces, settings
// Complementary scale: drives notes, subtle contrast elements
//
// Accents, semantic colors, and shadows remain hand-picked per theme.

import type { ThemeVars } from './presets'

// ── Types ────────────────────────────────────────────────────────────────────

export type ShadeStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

export type ShadeScale = Record<ShadeStep, string>

export interface ScaleThemeInput {
  primaryHue:        number   // 0–360
  primarySat:        number   // 0–100
  complementaryHue:  number   // 0–360  (often primaryHue +/- 180, but you can pick any)
  complementarySat:  number   // 0–100
  dark:              boolean

  // Hand-picked colors that don't fit the scale
  accent:      string
  accentText:  string
  danger?:     string   // default: #f87171 (dark) / #ef4444 (light)
  success?:    string   // default: #4ade80 (dark) / #22c55e (light)
  info?:       string   // default: accent

  // Clock widget overrides
  clockSecond?:  string  // default: accent
  clockHands?:   string  // default: derived from primary text

  // Note widget override
  noteDefaultBg?: string  // default: derived from complementary scale

  // Shadow style — pass custom or let it derive from dark/light
  shadowSm?: string
  shadowMd?: string
  shadowLg?: string

  // Text overrides
  textPrimary?: string  // default: derived from primary scale
  textMuted?:   string  // default: derived from primary scale
}

// ── Scale generation ─────────────────────────────────────────────────────────

const STEPS: ShadeStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

// Lightness curve — tuned so the dark end (700–900) has enough granularity
// for dark theme surfaces, and the light end (50–200) works for light themes.
//
// Calibrated against Dracula (#282a36 bg, #44475a border, #6272a4 active/muted)
// as the gold standard for dark theme surface hierarchy.
//
//   Dark:  900 canvas → 800 widget bg → 700 borders/hover → 600 active → 500 muted text
//   Light: 50 widget bg → 100 subtle → 200 borders → 300 active → 400 muted text
const LIGHTNESS: Record<ShadeStep, number> = {
  50:  97,
  100: 92,
  200: 82,
  300: 70,
  400: 56,
  500: 48,
  600: 32,
  700: 25,
  800: 18,
  900: 14,
}

// Saturation multiplier: peaks at 500 (muted text / active border level).
// Heavily desaturated at the dark end (700–900) — vivid colors at low lightness
// look harsh. Dracula keeps surfaces at S≈15% but muted text at S≈27%.
const SAT_CURVE: Record<ShadeStep, number> = {
  50:  0.55,
  100: 0.65,
  200: 0.75,
  300: 0.82,
  400: 0.90,
  500: 1.00,
  600: 0.62,
  700: 0.52,
  800: 0.52,
  900: 0.58,
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(color * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Generate a 50–900 shade scale from a hue and peak saturation.
 */
export function generateScale(hue: number, saturation: number): ShadeScale {
  const scale = {} as ShadeScale
  for (const step of STEPS) {
    scale[step] = hslToHex(hue, saturation * SAT_CURVE[step], LIGHTNESS[step])
  }
  return scale
}

/**
 * Get the complementary hue (180° opposite).
 */
export function complementary(hue: number): number {
  return (hue + 180) % 360
}

/**
 * Get analogous hues (30° offset).
 */
export function analogous(hue: number): [number, number] {
  return [(hue + 30) % 360, (hue + 330) % 360]
}

// ── ThemeVars builder ────────────────────────────────────────────────────────

/**
 * Build a complete ThemeVars from primary + complementary shade scales.
 *
 * Dark theme surface hierarchy (darkest → lightest), calibrated to Dracula:
 *   900 canvas → 800 widget bg → 700 hover/dividers → 600 borders → 500 active/muted text
 *
 * Light theme surface hierarchy (lightest → darkest):
 *   50 widget bg → 100 subtle → 200 hover → 300 borders → 400 muted text
 */
export function buildThemeVars(input: ScaleThemeInput): ThemeVars {
  const p = generateScale(input.primaryHue, input.primarySat)
  const c = generateScale(input.complementaryHue, input.complementarySat)

  const defaultDanger  = input.dark ? '#f87171' : '#ef4444'
  const defaultSuccess = input.dark ? '#4ade80' : '#22c55e'

  if (input.dark) {
    return {
      // Widget frame — 800 card, 600 border, 500 active (matches Dracula hierarchy)
      widgetBg:           p[800],
      widgetBorder:       p[600],
      widgetBorderActive: p[500],
      shadowSm:           input.shadowSm  ?? '0 1px 3px rgba(0,0,0,0.4)',
      shadowMd:           input.shadowMd  ?? '0 4px 16px rgba(0,0,0,0.5)',
      shadowLg:           input.shadowLg  ?? '0 20px 48px rgba(0,0,0,0.7)',
      backdropFilter:     'none',

      // Text — 50 is near-white, 500 is muted
      textPrimary: input.textPrimary ?? p[50],
      textMuted:   input.textMuted   ?? p[500],

      // Surfaces — 900 is the darkest (canvas behind widgets)
      surfaceSubtle: p[900],
      surfaceHover:  p[700],
      surfaceDanger: '#3a1a1a',

      // Accent + danger
      accent:     input.accent,
      accentText: input.accentText,
      danger:     input.danger  ?? defaultDanger,

      // Action panel
      actionBg:     p[800],
      actionBorder: p[600],

      // Settings panel
      settingsBg:      p[800],
      settingsBorder:  p[600],
      settingsDivider: p[700],
      settingsLabel:   p[500],
      scrollThumb:     p[500],

      // Clock widget
      clockFaceFill:   p[800],
      clockFaceStroke: p[600],
      clockTickMajor:  p[500],
      clockTickMinor:  p[700],
      clockHands:      input.clockHands  ?? p[100],
      clockSecond:     input.clockSecond ?? input.accent,
      clockCenter:     input.clockHands  ?? p[100],

      // Note widget — complementary scale for contrast
      noteDefaultBg: input.noteDefaultBg ?? c[700],

      // Status
      success: input.success ?? defaultSuccess,
      info:    input.info    ?? input.accent,
    }
  }

  // Light theme
  return {
    // Widget frame — 50 card, 200 border, 300 active
    widgetBg:           p[50],
    widgetBorder:       p[200],
    widgetBorderActive: p[300],
    shadowSm:           input.shadowSm  ?? '0 1px 3px rgba(0,0,0,0.08)',
    shadowMd:           input.shadowMd  ?? '0 4px 12px rgba(0,0,0,0.1)',
    shadowLg:           input.shadowLg  ?? '0 20px 40px rgba(0,0,0,0.14)',
    backdropFilter:     'none',

    // Text
    textPrimary: input.textPrimary ?? p[900],
    textMuted:   input.textMuted   ?? p[400],

    // Surfaces — 100 is the subtle bg behind widgets
    surfaceSubtle: p[100],
    surfaceHover:  p[200],
    surfaceDanger: '#fef2f2',

    // Accent + danger
    accent:     input.accent,
    accentText: input.accentText,
    danger:     input.danger  ?? defaultDanger,

    // Action panel
    actionBg:     p[50],
    actionBorder: p[200],

    // Settings panel
    settingsBg:      p[50],
    settingsBorder:  p[200],
    settingsDivider: p[100],
    settingsLabel:   p[400],
    scrollThumb:     p[300],

    // Clock widget
    clockFaceFill:   p[50],
    clockFaceStroke: p[200],
    clockTickMajor:  p[400],
    clockTickMinor:  p[200],
    clockHands:      input.clockHands  ?? p[900],
    clockSecond:     input.clockSecond ?? input.accent,
    clockCenter:     input.clockHands  ?? p[900],

    // Note widget — complementary for contrast
    noteDefaultBg: input.noteDefaultBg ?? c[100],

    // Status
    success: input.success ?? defaultSuccess,
    info:    input.info    ?? input.accent,
  }
}
