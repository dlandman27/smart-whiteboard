export interface Background {
  label: string
  bg:    string
  dot:   string
}

export const BACKGROUNDS: Background[] = [
  { label: 'Parchment', bg: '#f5f0eb', dot: '#c9bfb5' },
  { label: 'White',     bg: '#ffffff', dot: '#e2e8f0' },
  { label: 'Slate',     bg: '#f1f5f9', dot: '#cbd5e1' },
  { label: 'Sand',      bg: '#fdf6e3', dot: '#d4c5a9' },
  { label: 'Midnight',  bg: '#0f172a', dot: '#1e293b' },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0]
