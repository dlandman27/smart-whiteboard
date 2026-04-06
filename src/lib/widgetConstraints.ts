// ── Widget dimension constraints ──────────────────────────────────────────────
//
// Canonical source of truth for per-widget-type min/max sizes.
// Widget.tsx reads these via props (passed from WidgetCanvas → registry def).
// The global fallback (MIN_W / MIN_H) matches the legacy inline values in Widget.tsx.

export interface WidgetSizeConstraints {
  minWidth:  number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
}

/** Global fallback constraints — applied when a widget def provides no overrides. */
export const DEFAULT_CONSTRAINTS: WidgetSizeConstraints = {
  minWidth:  120,
  minHeight: 80,
}

/** GiphyWidget: square-ish GIFs look best; enforce a sensible floor and ceiling. */
export const GIPHY_CONSTRAINTS: WidgetSizeConstraints = {
  minWidth:  160,
  minHeight: 160,
  maxWidth:  900,
  maxHeight: 900,
}

/**
 * Clamp a proposed (width, height) pair to the given constraints.
 * Returns a new object — never mutates the input.
 */
export function clampSize(
  width:  number,
  height: number,
  constraints: WidgetSizeConstraints = DEFAULT_CONSTRAINTS,
): { width: number; height: number } {
  return {
    width:  Math.min(
      constraints.maxWidth  ?? Infinity,
      Math.max(constraints.minWidth,  width),
    ),
    height: Math.min(
      constraints.maxHeight ?? Infinity,
      Math.max(constraints.minHeight, height),
    ),
  }
}
