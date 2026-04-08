// ── Primitive design tokens ───────────────────────────────────────────────────
// Source: Figma Variables export.
// Fixes applied vs. raw export:
//   • font-weight values had "px" suffix (e.g. "500px") — removed, weights are unitless
//   • line-height values had Figma float noise and "px" suffix — rounded and removed unit
//   • font-size 5xl was "48" (missing unit) — fixed to "48px"
//   • border-width "bold" key renamed to "lg" for consistency

export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '24px',
  full: '999px',
} as const

export const fontSize = {
  '2xs': '11px',
  'xs':  '12px',
  'sm':  '14px',
  'md':  '16px',
  'lg':  '18px',
  'xl':  '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',   // fixed: was "48" in Figma export
} as const

export const fontFamily = {
  base:    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  mono:    'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
  display: "'Lora', Georgia, 'Times New Roman', serif",
} as const

export const fontWeight = {
  light:    '300',  // fixed: was "300px"
  regular:  '400',  // fixed: was "400px"
  medium:   '500',  // fixed: was "500px"
  semiBold: '600',  // fixed: was "600px"
  bold:     '700',  // fixed: was "700px"
} as const

export const lineHeight = {
  tight:   '1.2',   // fixed: was "1.2000000476837158px"
  normal:  '1.4',   // fixed: was "1.399999976158142px"
  relaxed: '1.6',   // fixed: was "1.600000023841858px"
} as const

export const space = {
  '1x':  '4px',
  '2x':  '8px',
  '3x':  '12px',
  '4x':  '16px',
  '6x':  '24px',
  '8x':  '32px',
  '12x': '48px',
  '16x': '64px',
} as const

export const borderWidth = {
  sm: '1px',
  md: '2px',
  lg: '4px',  // renamed from "bold"
} as const

// ── Type helpers ──────────────────────────────────────────────────────────────

export type Radius      = keyof typeof radius
export type FontSize    = keyof typeof fontSize
export type FontFamily  = keyof typeof fontFamily
export type FontWeight  = keyof typeof fontWeight
export type LineHeight  = keyof typeof lineHeight
export type Space       = keyof typeof space
export type BorderWidth = keyof typeof borderWidth
