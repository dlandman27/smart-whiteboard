export type BackgroundPattern = 'dots' | 'lines' | 'grid' | 'solid' | 'gradient' | 'image' | 'photos'

export interface Background {
  label:         string
  bg:            string
  dot:           string
  pattern?:      BackgroundPattern  // defaults to 'dots'
  gradientTo?:   string             // used when pattern === 'gradient'
  imageUrl?:     string             // used when pattern === 'image'
  imageDim?:     number             // 0–1 dark overlay opacity, default 0
  albumId?:      string             // used when pattern === 'photos'
  photoInterval?: number            // seconds between transitions, default 30
}

export const BACKGROUNDS: Background[] = [
  // ── Dot grid ────────────────────────────────────────────────────────────────
  { label: 'Parchment',   bg: '#f5f0eb', dot: '#c9bfb5' },
  { label: 'White',       bg: '#ffffff', dot: '#e2e8f0' },
  { label: 'Cream',       bg: '#faf8f5', dot: '#e0d8cc' },
  { label: 'Slate',       bg: '#f1f5f9', dot: '#cbd5e1' },
  { label: 'Sand',        bg: '#fdf6e3', dot: '#d4c5a9' },
  { label: 'Blush',       bg: '#fff0f3', dot: '#fecdd3' },
  { label: 'Lavender',    bg: '#f5f0ff', dot: '#ddd6fe' },
  { label: 'Sage',        bg: '#f0f7f0', dot: '#c6dfc6' },
  { label: 'Charcoal',    bg: '#1a1a1a', dot: '#2d2d2d' },
  { label: 'Midnight',    bg: '#0f172a', dot: '#1e293b' },
  { label: 'Abyss',       bg: '#070c14', dot: '#0d2035' },
  { label: 'Void',        bg: '#0a0a0a', dot: '#1a1a1a' },
  { label: 'Deep Forest', bg: '#0a150a', dot: '#162616' },

  // ── Lines ────────────────────────────────────────────────────────────────────
  { label: 'Ruled Light', bg: '#fdfcfb', dot: '#e5ddd5', pattern: 'lines' },
  { label: 'Ruled Slate', bg: '#f1f5f9', dot: '#c8d6e5', pattern: 'lines' },
  { label: 'Ruled Dark',  bg: '#141414', dot: '#252525', pattern: 'lines' },

  // ── Grid ────────────────────────────────────────────────────────────────────
  { label: 'Grid Light',  bg: '#ffffff', dot: '#e2e8f0', pattern: 'grid' },
  { label: 'Grid Warm',   bg: '#faf8f5', dot: '#ddd0c4', pattern: 'grid' },
  { label: 'Grid Dark',   bg: '#111111', dot: '#242424', pattern: 'grid' },

  // ── Solid ────────────────────────────────────────────────────────────────────
  { label: 'Snow',        bg: '#ffffff', dot: '#ffffff', pattern: 'solid' },
  { label: 'Off-white',   bg: '#faf9f7', dot: '#faf9f7', pattern: 'solid' },
  { label: 'Obsidian',    bg: '#0a0a0a', dot: '#0a0a0a', pattern: 'solid' },
  { label: 'Ink',         bg: '#1a1a2e', dot: '#1a1a2e', pattern: 'solid' },

  // ── Gradient ────────────────────────────────────────────────────────────────
  { label: 'Dawn',      bg: '#fde8d8', dot: '#f7d0e0', pattern: 'gradient', gradientTo: '#e8d5f5' },
  { label: 'Dusk',      bg: '#1a0533', dot: '#0d1b3e', pattern: 'gradient', gradientTo: '#0d1b3e' },
  { label: 'Aurora',    bg: '#0a2a2a', dot: '#1a4a3a', pattern: 'gradient', gradientTo: '#1a0533' },
  { label: 'Peach Sky', bg: '#fff1e6', dot: '#fce4d6', pattern: 'gradient', gradientTo: '#fde8ff' },
  { label: 'Deep Sea',  bg: '#020b18', dot: '#031b2e', pattern: 'gradient', gradientTo: '#001a10' },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0]
