import type { Layout, LayoutCategory } from '../types'

export const DEFAULT_LAYOUT_ID = 'dashboard'

export const LAYOUT_SECTIONS: Array<{ category: LayoutCategory; label: string }> = [
  { category: 'simple',     label: 'SIMPLE'     },
  { category: 'grid',       label: 'GRID'       },
  { category: 'asymmetric', label: 'ASYMMETRIC' },
]

export const LAYOUT_PRESETS: Layout[] = [
  {
    id:    'custom',
    name:  'Custom (AI)',
    slots: [], // slots are stored on the board itself
  },

  // ── Simple ─────────────────────────────────────────────────────────────────

  {
    id:       'focus',
    name:     'Focus',
    category: 'simple',
    slots: [
      { id: 'main', label: 'Main', x: 0, y: 0, width: 1, height: 1 },
    ],
  },
  {
    id:       'split-h',
    name:     'Split',
    category: 'simple',
    slots: [
      { id: 'left',  label: 'Left',  x: 0,   y: 0, width: 0.5, height: 1 },
      { id: 'right', label: 'Right', x: 0.5, y: 0, width: 0.5, height: 1 },
    ],
  },
  {
    id:       'split-v',
    name:     'Top / Bottom',
    category: 'simple',
    slots: [
      { id: 'top',    label: 'Top',    x: 0, y: 0,   width: 1, height: 0.5 },
      { id: 'bottom', label: 'Bottom', x: 0, y: 0.5, width: 1, height: 0.5 },
    ],
  },
  {
    id:       'triple',
    name:     '3 Columns',
    category: 'simple',
    slots: [
      { id: 'col-1', label: 'Col 1', x: 0,       y: 0, width: 1 / 3, height: 1 },
      { id: 'col-2', label: 'Col 2', x: 1 / 3,   y: 0, width: 1 / 3, height: 1 },
      { id: 'col-3', label: 'Col 3', x: 2 / 3,   y: 0, width: 1 / 3, height: 1 },
    ],
  },
  {
    id:       'triple-rows',
    name:     '3 Rows',
    category: 'simple',
    slots: [
      { id: 'row-1', label: 'Row 1', x: 0, y: 0,       width: 1, height: 1 / 3 },
      { id: 'row-2', label: 'Row 2', x: 0, y: 1 / 3,   width: 1, height: 1 / 3 },
      { id: 'row-3', label: 'Row 3', x: 0, y: 2 / 3,   width: 1, height: 1 / 3 },
    ],
  },

  // ── Grid ───────────────────────────────────────────────────────────────────

  {
    id:       'grid-2x2',
    name:     'Grid 2×2',
    category: 'grid',
    slots: [
      { id: 'tl', label: 'Top Left',     x: 0,   y: 0,   width: 0.5, height: 0.5 },
      { id: 'tr', label: 'Top Right',    x: 0.5, y: 0,   width: 0.5, height: 0.5 },
      { id: 'bl', label: 'Bottom Left',  x: 0,   y: 0.5, width: 0.5, height: 0.5 },
      { id: 'br', label: 'Bottom Right', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ],
  },
  {
    id:       'grid-3x2',
    name:     'Grid 3×2',
    category: 'grid',
    slots: [
      { id: 'r1c1', label: 'Row 1 Col 1', x: 0,       y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r1c2', label: 'Row 1 Col 2', x: 1 / 3,   y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r1c3', label: 'Row 1 Col 3', x: 2 / 3,   y: 0,   width: 1 / 3, height: 0.5 },
      { id: 'r2c1', label: 'Row 2 Col 1', x: 0,       y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 'r2c2', label: 'Row 2 Col 2', x: 1 / 3,   y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 'r2c3', label: 'Row 2 Col 3', x: 2 / 3,   y: 0.5, width: 1 / 3, height: 0.5 },
    ],
  },
  {
    id:       'grid-4x2',
    name:     'Grid 4×2',
    category: 'grid',
    slots: [
      { id: 'r1c1', label: 'Row 1 Col 1', x: 0,    y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c2', label: 'Row 1 Col 2', x: 0.25, y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c3', label: 'Row 1 Col 3', x: 0.5,  y: 0,   width: 0.25, height: 0.5 },
      { id: 'r1c4', label: 'Row 1 Col 4', x: 0.75, y: 0,   width: 0.25, height: 0.5 },
      { id: 'r2c1', label: 'Row 2 Col 1', x: 0,    y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c2', label: 'Row 2 Col 2', x: 0.25, y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c3', label: 'Row 2 Col 3', x: 0.5,  y: 0.5, width: 0.25, height: 0.5 },
      { id: 'r2c4', label: 'Row 2 Col 4', x: 0.75, y: 0.5, width: 0.25, height: 0.5 },
    ],
  },

  // ── Asymmetric ─────────────────────────────────────────────────────────────

  {
    id:       'dashboard',
    name:     'Dashboard',
    category: 'asymmetric',
    slots: [
      { id: 'main',     label: 'Main',   x: 0,   y: 0,       width: 0.6, height: 1 },
      { id: 'side-top', label: 'Top',    x: 0.6, y: 0,       width: 0.4, height: 1 / 3 },
      { id: 'side-mid', label: 'Middle', x: 0.6, y: 1 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'side-bot', label: 'Bottom', x: 0.6, y: 2 / 3,   width: 0.4, height: 1 / 3 },
    ],
  },
  {
    id:       'dashboard-r',
    name:     'Dashboard (R)',
    category: 'asymmetric',
    slots: [
      { id: 'side-top', label: 'Top',    x: 0,   y: 0,       width: 0.4, height: 1 / 3 },
      { id: 'side-mid', label: 'Middle', x: 0,   y: 1 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'side-bot', label: 'Bottom', x: 0,   y: 2 / 3,   width: 0.4, height: 1 / 3 },
      { id: 'main',     label: 'Main',   x: 0.4, y: 0,        width: 0.6, height: 1     },
    ],
  },
  {
    id:       'sidebar-l',
    name:     'Sidebar Left',
    category: 'asymmetric',
    slots: [
      { id: 'left-col',  label: 'Sidebar',    x: 0,    y: 0,    width: 0.28, height: 1    },
      { id: 'top-right', label: 'Top Center', x: 0.28, y: 0,    width: 0.42, height: 0.42 },
      { id: 'top-far',   label: 'Top Right',  x: 0.70, y: 0,    width: 0.30, height: 0.42 },
      { id: 'bottom',    label: 'Main',       x: 0.28, y: 0.42, width: 0.72, height: 0.58 },
    ],
  },
  {
    id:       'sidebar-r',
    name:     'Sidebar Right',
    category: 'asymmetric',
    slots: [
      { id: 'top-left',  label: 'Top Left',  x: 0,    y: 0,    width: 0.30, height: 0.42 },
      { id: 'top-wide',  label: 'Top Wide',  x: 0.30, y: 0,    width: 0.42, height: 0.42 },
      { id: 'bottom',    label: 'Main',      x: 0,    y: 0.42, width: 0.72, height: 0.58 },
      { id: 'right-col', label: 'Sidebar',   x: 0.72, y: 0,    width: 0.28, height: 1    },
    ],
  },
  {
    id:       'big-strip',
    name:     'Big + Strip',
    category: 'asymmetric',
    slots: [
      { id: 'main',    label: 'Main',    x: 0,     y: 0,    width: 1,     height: 0.65 },
      { id: 'strip-1', label: 'Strip 1', x: 0,     y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 'strip-2', label: 'Strip 2', x: 1 / 3, y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 'strip-3', label: 'Strip 3', x: 2 / 3, y: 0.65, width: 1 / 3, height: 0.35 },
    ],
  },
  {
    id:       'header-3',
    name:     'Header + 3',
    category: 'asymmetric',
    slots: [
      { id: 'header', label: 'Header', x: 0,       y: 0,    width: 1,     height: 0.38 },
      { id: 'col-1',  label: 'Col 1',  x: 0,       y: 0.38, width: 1 / 3, height: 0.62 },
      { id: 'col-2',  label: 'Col 2',  x: 1 / 3,   y: 0.38, width: 1 / 3, height: 0.62 },
      { id: 'col-3',  label: 'Col 3',  x: 2 / 3,   y: 0.38, width: 1 / 3, height: 0.62 },
    ],
  },
  {
    id:       'mosaic',
    name:     'Mosaic',
    category: 'asymmetric',
    slots: [
      { id: 'tl',     label: 'Main',          x: 0,    y: 0,    width: 0.55, height: 0.55 },
      { id: 'tr-top', label: 'Top Right',     x: 0.55, y: 0,    width: 0.45, height: 0.27 },
      { id: 'tr-bot', label: 'Mid Right',     x: 0.55, y: 0.27, width: 0.45, height: 0.28 },
      { id: 'bl-l',   label: 'Bottom Left',   x: 0,    y: 0.55, width: 0.28, height: 0.45 },
      { id: 'bl-r',   label: 'Bottom Center', x: 0.28, y: 0.55, width: 0.27, height: 0.45 },
      { id: 'br',     label: 'Bottom Right',  x: 0.55, y: 0.55, width: 0.45, height: 0.45 },
    ],
  },
]

export function getLayoutPreset(id: string): Layout {
  return LAYOUT_PRESETS.find((l) => l.id === id) ?? LAYOUT_PRESETS[0]
}
