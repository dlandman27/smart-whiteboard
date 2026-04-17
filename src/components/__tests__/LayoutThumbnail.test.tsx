import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { LayoutThumbnail } from '../layout/LayoutThumbnail'
import type { Layout } from '../../types'

const freeformLayout: Layout = {
  id: 'freeform',
  name: 'Freeform',
  slots: [],
}

const focusLayout: Layout = {
  id: 'focus',
  name: 'Focus',
  slots: [{ id: 'main', x: 0, y: 0, width: 1, height: 1 }],
}

const dashboardLayout: Layout = {
  id: 'dashboard',
  name: 'Dashboard',
  slots: [
    { id: 'main',      x: 0,   y: 0,       width: 0.6, height: 1 },
    { id: 'side-top',  x: 0.6, y: 0,       width: 0.4, height: 1 / 3 },
    { id: 'side-mid',  x: 0.6, y: 1 / 3,   width: 0.4, height: 1 / 3 },
    { id: 'side-bot',  x: 0.6, y: 2 / 3,   width: 0.4, height: 1 / 3 },
  ],
}

const grid2x2Layout: Layout = {
  id: 'grid-2x2',
  name: 'Grid 2x2',
  slots: [
    { id: 'tl', x: 0,   y: 0,   width: 0.5, height: 0.5 },
    { id: 'tr', x: 0.5, y: 0,   width: 0.5, height: 0.5 },
    { id: 'bl', x: 0,   y: 0.5, width: 0.5, height: 0.5 },
    { id: 'br', x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  ],
}

describe('LayoutThumbnail', () => {
  it('renders without crashing with freeform (no slots)', () => {
    const { container } = render(<LayoutThumbnail layout={freeformLayout} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders an SVG element', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders correct number of rects for focus layout (1 slot)', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(1)
  })

  it('renders correct number of rects for dashboard layout (4 slots)', () => {
    const { container } = render(<LayoutThumbnail layout={dashboardLayout} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(4)
  })

  it('renders correct number of rects for grid 2x2 layout (4 slots)', () => {
    const { container } = render(<LayoutThumbnail layout={grid2x2Layout} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(4)
  })

  it('uses default width=88 and height=60 when no dimensions provided', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} />)
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.getAttribute('width')).toBe('88')
    expect(svg.getAttribute('height')).toBe('60')
  })

  it('respects custom width and height', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} width={120} height={80} />)
    const svg = container.querySelector('svg') as SVGElement
    expect(svg.getAttribute('width')).toBe('120')
    expect(svg.getAttribute('height')).toBe('80')
  })

  it('uses accent fill when active=true', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} active={true} />)
    const rect = container.querySelector('rect')
    expect(rect?.getAttribute('fill')).toBe('var(--wt-accent)')
  })

  it('uses currentColor fill when active=false', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} active={false} />)
    const rect = container.querySelector('rect')
    expect(rect?.getAttribute('fill')).toBe('currentColor')
  })

  it('renders with no slots without throwing', () => {
    expect(() => render(<LayoutThumbnail layout={freeformLayout} />)).not.toThrow()
  })

  it('sets correct viewBox attribute', () => {
    const { container } = render(<LayoutThumbnail layout={focusLayout} width={88} height={60} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 88 60')
  })
})
