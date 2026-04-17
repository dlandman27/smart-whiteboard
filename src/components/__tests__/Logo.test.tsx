import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Logo } from '../Logo'

describe('Logo', () => {
  it('renders without crashing', () => {
    const { container } = render(<Logo />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders an SVG element', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('uses default size of 32', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(32)
  })

  it('accepts a custom size prop', () => {
    const { container } = render(<Logo size={64} />)
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(64)
  })

  it('scales height proportionally to size', () => {
    const size = 163
    const { container } = render(<Logo size={size} />)
    const svg = container.querySelector('svg')!
    const expectedHeight = Math.round((size * 151) / 163)
    expect(Number(svg.getAttribute('height'))).toBe(expectedHeight)
  })

  it('has the correct viewBox', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 163 151')
  })

  it('renders two path elements', () => {
    const { container } = render(<Logo />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2)
  })

  it('has currentColor fill on paths', () => {
    const { container } = render(<Logo />)
    const paths = container.querySelectorAll('path')
    for (const path of paths) {
      expect(path.getAttribute('fill')).toBe('currentColor')
    }
  })
})
