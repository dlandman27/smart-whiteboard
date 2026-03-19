export interface Background {
  label: string
  bg:    string
  dot:   string
}

export const BACKGROUNDS: Background[] = [
  // Light
  { label: 'Parchment', bg: '#f5f0eb', dot: '#c9bfb5' },
  { label: 'White',     bg: '#ffffff', dot: '#e2e8f0' },
  { label: 'Cream',     bg: '#faf8f5', dot: '#e0d8cc' },
  { label: 'Slate',     bg: '#f1f5f9', dot: '#cbd5e1' },
  { label: 'Sand',      bg: '#fdf6e3', dot: '#d4c5a9' },
  { label: 'Blush',     bg: '#fff0f3', dot: '#fecdd3' },
  { label: 'Lavender',  bg: '#f5f0ff', dot: '#ddd6fe' },
  { label: 'Sage',      bg: '#f0f7f0', dot: '#c6dfc6' },
  // Dark
  { label: 'Charcoal',  bg: '#1a1a1a', dot: '#2d2d2d' },
  { label: 'Midnight',  bg: '#0f172a', dot: '#1e293b' },
  { label: 'Abyss',     bg: '#070c14', dot: '#0d2035' },
  { label: 'Void',      bg: '#0a0a0a', dot: '#1a1a1a' },
  { label: 'Deep Forest', bg: '#0a150a', dot: '#162616' },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0]
