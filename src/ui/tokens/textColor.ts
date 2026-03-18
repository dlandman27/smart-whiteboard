export type TextColor = 'default' | 'muted' | 'accent' | 'danger' | 'onAccent' | 'disabled'

export const textColorVar: Record<TextColor, string> = {
  default:  'var(--wt-text)',
  muted:    'var(--wt-text-muted)',
  accent:   'var(--wt-accent)',
  danger:   'var(--wt-danger)',
  onAccent: 'var(--wt-accent-text)',
  disabled: 'var(--wt-text-muted)',
}
