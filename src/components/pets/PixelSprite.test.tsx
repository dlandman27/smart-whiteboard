import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PixelSprite } from './PixelSprite'
import { SPRITES, PX } from './sprites'

const catSprite = SPRITES.cat
const robotSprite = SPRITES.robot

describe('PixelSprite', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('SVG has correct width and height based on sprite dimensions', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(catSprite.width * PX)
    expect(Number(svg.getAttribute('height'))).toBe(catSprite.height * PX)
  })

  it('renders rect elements for non-transparent pixels', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBeGreaterThan(0)
  })

  it('does not render rect for space (transparent) pixels', () => {
    // A sprite with a known transparent pixel
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    // Count non-space chars in frame 0
    const frame = catSprite.frames[0]
    const nonTransparent = frame.join('').split('').filter((c) => c !== ' ').length
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(nonTransparent)
  })

  it('renders with different sprite data (robot)', () => {
    const { container } = render(
      <PixelSprite sprite={robotSprite} frameIdx={1} flip={false} />
    )
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBe(robotSprite.width * PX)
    expect(Number(svg.getAttribute('height'))).toBe(robotSprite.height * PX)
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBeGreaterThan(0)
  })

  it('applies scaleX(-1) transform when flip=true', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={true} />
    )
    const svg = container.querySelector('svg')!
    expect(svg.style.transform).toBe('scaleX(-1)')
  })

  it('does not apply transform when flip=false', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    const svg = container.querySelector('svg')!
    // transform should be undefined / empty
    expect(svg.style.transform || '').toBe('')
  })

  it('handles an empty frame gracefully', () => {
    const emptySprite = {
      ...catSprite,
      frames: [[], catSprite.frames[1], catSprite.frames[2]] as any,
    }
    const { container } = render(
      <PixelSprite sprite={emptySprite} frameIdx={0} flip={false} />
    )
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(0)
  })

  it('renders frame index 2 correctly', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={2} flip={false} />
    )
    const frame = catSprite.frames[2]
    const nonTransparent = frame.join('').split('').filter((c) => c !== ' ').length
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(nonTransparent)
  })

  it('has pixelated imageRendering style', () => {
    const { container } = render(
      <PixelSprite sprite={catSprite} frameIdx={0} flip={false} />
    )
    const svg = container.querySelector('svg')!
    expect(svg.style.imageRendering).toBe('pixelated')
  })
})
