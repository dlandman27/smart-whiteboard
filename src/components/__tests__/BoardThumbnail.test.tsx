import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('../../store/theme', () => ({
  useThemeStore: vi.fn((selector) =>
    selector({
      background: {
        label: 'Parchment',
        bg: '#f5f0eb',
        dot: '#c9bfb5',
        pattern: 'dots',
      },
    })
  ),
}))

import { BoardThumbnail } from '../BoardThumbnail'
import type { Board } from '../../store/whiteboard'

const emptyBoard: Board = {
  id: 'b1',
  name: 'Main',
  layoutId: 'freeform',
  widgets: [],
}

const boardWithWidgets: Board = {
  id: 'b2',
  name: 'Dashboard',
  layoutId: 'dashboard',
  widgets: [
    { id: 'w1', x: 100, y: 100, width: 300, height: 200, type: 'clock', databaseTitle: '', variantId: 'digital' },
    { id: 'w2', x: 500, y: 100, width: 200, height: 300, type: 'weather', databaseTitle: '', variantId: 'default' },
  ],
}

describe('BoardThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders an SVG element', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders with default dimensions', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('72')
    expect(svg?.getAttribute('height')).toBe('48')
  })

  it('renders with custom dimensions', () => {
    render(<BoardThumbnail board={emptyBoard} width={120} height={80} />)
    const svg = document.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('120')
    expect(svg?.getAttribute('height')).toBe('80')
  })

  it('shows "empty" text when board has no widgets', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    expect(screen.getByText('empty')).toBeInTheDocument()
  })

  it('does not show "empty" text when board has widgets', () => {
    render(<BoardThumbnail board={boardWithWidgets} />)
    expect(screen.queryByText('empty')).not.toBeInTheDocument()
  })

  it('renders widget rectangles for each widget', () => {
    render(<BoardThumbnail board={boardWithWidgets} />)
    // Each widget should render as a rect
    const rects = document.querySelectorAll('rect[fill="var(--wt-accent)"]')
    expect(rects).toHaveLength(2)
  })

  it('renders background rect', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    const rects = document.querySelectorAll('rect')
    // At least one rect for background
    expect(rects.length).toBeGreaterThan(0)
  })

  it('renders dot pattern', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    const pattern = document.querySelector('pattern')
    expect(pattern).toBeInTheDocument()
  })

  it('uses board id in pattern id to avoid collisions', () => {
    render(<BoardThumbnail board={emptyBoard} />)
    const pattern = document.querySelector('pattern')
    expect(pattern?.getAttribute('id')).toContain('b1')
  })
})
