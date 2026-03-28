import type { Layout } from '../types'

export const DEFAULT_LAYOUT_ID = 'dashboard'

export const LAYOUT_PRESETS: Layout[] = [
  {
    id:    'freeform',
    name:  'Freeform',
    slots: [],
  },
  {
    id:    'custom',
    name:  'Custom (AI)',
    slots: [], // slots are stored on the board itself
  },
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

  // ── New layouts ────────────────────────────────────────────────────────────

  {
    id: 'split-v',
    name: 'Top / Bottom',
    slots: [
      { id: 'top',    x: 0, y: 0,   width: 1, height: 0.5 },
      { id: 'bottom', x: 0, y: 0.5, width: 1, height: 0.5 },
    ],
  },
  {
    id: 'triple',
    name: '3 Columns',
    slots: [
      { id: 'col-1', x: 0,       y: 0, width: 1 / 3, height: 1 },
      { id: 'col-2', x: 1 / 3,   y: 0, width: 1 / 3, height: 1 },
      { id: 'col-3', x: 2 / 3,   y: 0, width: 1 / 3, height: 1 },
    ],
  },
  {
    id: 'triple-rows',
    name: '3 Rows',
    slots: [
      { id: 'row-1', x: 0, y: 0,       width: 1, height: 1 / 3 },
      { id: 'row-2', x: 0, y: 1 / 3,   width: 1, height: 1 / 3 },
      { id: 'row-3', x: 0, y: 2 / 3,   width: 1, height: 1 / 3 },
    ],
  },
  {
    id: 'sidebar-l',
    name: 'Sidebar Left',
    slots: [
      { id: 'left-col',  x: 0,    y: 0,    width: 0.28, height: 1    },
      { id: 'top-right', x: 0.28, y: 0,    width: 0.42, height: 0.42 },
      { id: 'top-far',   x: 0.70, y: 0,    width: 0.30, height: 0.42 },
      { id: 'bottom',    x: 0.28, y: 0.42, width: 0.72, height: 0.58 },
    ],
  },
  {
    id: 'header-3',
    name: 'Header + 3',
    slots: [
      { id: 'header', x: 0,       y: 0,    width: 1,     height: 0.38 },
      { id: 'col-1',  x: 0,       y: 0.38, width: 1 / 3, height: 0.62 },
      { id: 'col-2',  x: 1 / 3,   y: 0.38, width: 1 / 3, height: 0.62 },
      { id: 'col-3',  x: 2 / 3,   y: 0.38, width: 1 / 3, height: 0.62 },
    ],
  },
  {
    id: 'dashboard-r',
    name: 'Dashboard (R)',
    slots: [
      { id: 'side-top', x: 0,   y: 0,       width: 0.4, height: 1 / 3 },
      { id: 'side-mid', x: 0,   y: 1 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'side-bot', x: 0,   y: 2 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'main',     x: 0.4, y: 0,        width: 0.6, height: 1     },
    ],
  },
  {
    id: 'grid-4x2',
    name: 'Grid 4×2',
    slots: [
      { id: 'r1c1', x: 0,    y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c2', x: 0.25, y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c3', x: 0.5,  y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c4', x: 0.75, y: 0,   width: 0.25, height: 0.5 },
      { id: 'r2c1', x: 0,    y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c2', x: 0.25, y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c3', x: 0.5,  y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c4', x: 0.75, y: 0.5, width: 0.25, height: 0.5 },
    ],
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    slots: [
      { id: 'tl',     x: 0,    y: 0,    width: 0.55, height: 0.55 },
      { id: 'tr-top', x: 0.55, y: 0,    width: 0.45, height: 0.27 },
      { id: 'tr-bot', x: 0.55, y: 0.27, width: 0.45, height: 0.28 },
      { id: 'bl-l',   x: 0,    y: 0.55, width: 0.28, height: 0.45 },
      { id: 'bl-r',   x: 0.28, y: 0.55, width: 0.27, height: 0.45 },
      { id: 'br',     x: 0.55, y: 0.55, width: 0.45, height: 0.45 },
    ],
  },
]

export function getLayoutPreset(id: string): Layout {
  return LAYOUT_PRESETS.find((l) => l.id === id) ?? LAYOUT_PRESETS[0]
}
