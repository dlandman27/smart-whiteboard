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
