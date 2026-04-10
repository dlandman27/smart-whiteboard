// ── Widget-specific design tokens ────────────────────────────────────────────
// Extends the primitive token set with widget-sizing and breakpoint tokens.

// ── Width breakpoints ─────────────────────────────────────────────────────────
export const widgetBreakpoints = {
  xs: 160,
  sm: 240,
  md: 360,
  lg: 480,
  xl: 640,
} as const

export type WidgetBreakpoint = keyof typeof widgetBreakpoints

/** Returns the breakpoint key for a given container width. */
export function getBreakpoint(containerWidth: number): WidgetBreakpoint {
  if (containerWidth < widgetBreakpoints.sm) return 'xs'
  if (containerWidth < widgetBreakpoints.md) return 'sm'
  if (containerWidth < widgetBreakpoints.lg) return 'md'
  if (containerWidth < widgetBreakpoints.xl) return 'lg'
  return 'xl'
}

// ── Default sizing constraints ────────────────────────────────────────────────
export const widgetSizing = {
  minWidth:  160,
  minHeight: 120,
  maxWidth:  1600,
  maxHeight: 1200,
} as const

// ── Constraint shape used in registry metadata ────────────────────────────────
export interface WidgetConstraints {
  minWidth?:    number
  minHeight?:   number
  maxWidth?:    number
  maxHeight?:   number
  /** width / height ratio, e.g. 16/9 */
  aspectRatio?: number
}

// ── Widget shapes (fixed sizes for variant system) ───────────────────────
export interface WidgetShape {
  id:     string
  width:  number
  height: number
  label:  string
}

export const WIDGET_SHAPES = {
  'small-square':  { id: 'small-square',  width: 200, height: 200, label: 'Small Square' },
  'small-wide':    { id: 'small-wide',    width: 320, height: 200, label: 'Small Wide' },
  'medium-square': { id: 'medium-square', width: 320, height: 320, label: 'Medium Square' },
  'medium-wide':   { id: 'medium-wide',   width: 480, height: 320, label: 'Medium Wide' },
  'tall-rect':     { id: 'tall-rect',     width: 300, height: 420, label: 'Tall' },
  'large-wide':    { id: 'large-wide',    width: 600, height: 400, label: 'Large Wide' },
  'extra-wide':    { id: 'extra-wide',    width: 800, height: 540, label: 'Extra Wide' },
} as const satisfies Record<string, WidgetShape>
