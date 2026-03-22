import type { Layout } from '../types'

export const DEFAULT_LAYOUT_ID = 'dashboard'

export const LAYOUT_PRESETS: Layout[] = [
  {
    id: 'focus',
    name: 'Focus',
    slots: [
      { id: 'main', x: 0, y: 0, width: 1, height: 1 },
    ],
  },
  {
    id: 'split-h',
    name: 'Split',
    slots: [
      { id: 'left',  x: 0,   y: 0, width: 0.5, height: 1 },
      { id: 'right', x: 0.5, y: 0, width: 0.5, height: 1 },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    slots: [
      { id: 'main',      x: 0,   y: 0,       width: 0.6, height: 1 },
      { id: 'side-top',  x: 0.6, y: 0,       width: 0.4, height: 1 / 3 },
      { id: 'side-mid',  x: 0.6, y: 1 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'side-bot',  x: 0.6, y: 2 / 3,   width: 0.4, height: 1 / 3 },
    ],
  },
  {
    id: 'grid-2x2',
    name: 'Grid 2×2',
    slots: [
      { id: 'tl', x: 0,   y: 0,   width: 0.5, height: 0.5 },
      { id: 'tr', x: 0.5, y: 0,   width: 0.5, height: 0.5 },
      { id: 'bl', x: 0,   y: 0.5, width: 0.5, height: 0.5 },
      { id: 'br', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ],
  },
  {
    id: 'grid-3x2',
    name: 'Grid 3×2',
    slots: [
      { id: 'r1c1', x: 0,       y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r1c2', x: 1 / 3,   y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r1c3', x: 2 / 3,   y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r2c1', x: 0,       y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 'r2c2', x: 1 / 3,   y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 'r2c3', x: 2 / 3,   y: 0.5, width: 1 / 3, height: 0.5 },
    ],
  },
  {
    id: 'sidebar-r',
    name: 'Sidebar Right',
    slots: [
      { id: 'top-left',  x: 0,    y: 0,    width: 0.30, height: 0.42 },
      { id: 'top-wide',  x: 0.30, y: 0,    width: 0.42, height: 0.42 },
      { id: 'bottom',    x: 0,    y: 0.42, width: 0.72, height: 0.58 },
      { id: 'right-col', x: 0.72, y: 0,    width: 0.28, height: 1    },
    ],
  },
  {
    id: 'big-strip',
    name: 'Big + Strip',
    slots: [
      { id: 'main',    x: 0,     y: 0,    width: 1,     height: 0.65 },
      { id: 'strip-1', x: 0,     y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 'strip-2', x: 1 / 3, y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 'strip-3', x: 2 / 3, y: 0.65, width: 1 / 3, height: 0.35 },
    ],
  },
]

export function getLayoutPreset(id: string): Layout {
  return LAYOUT_PRESETS.find((l) => l.id === id) ?? LAYOUT_PRESETS[0]
}
