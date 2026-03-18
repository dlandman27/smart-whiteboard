// ── Semantic text color tokens ────────────────────────────────────────────────
// Maps semantic color roles to theme CSS variables (--wt-*).
// Theme-aware: values change automatically when the active theme changes.

export type TextColor =
  | 'default'   // primary content
  | 'muted'     // secondary content, placeholders
  | 'accent'    // highlighted / branded
  | 'danger'    // errors, destructive actions
  | 'onAccent'  // text sitting on an accent background
  | 'disabled'  // non-interactive, low emphasis

export const textColor: Record<TextColor, string> = {
  default:  'var(--wt-text)',
  muted:    'var(--wt-text-muted)',
  accent:   'var(--wt-accent)',
  danger:   'var(--wt-danger)',
  onAccent: 'var(--wt-accent-text)',
  disabled: 'var(--wt-text-muted)',
}
