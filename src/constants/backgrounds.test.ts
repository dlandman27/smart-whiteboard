import { describe, it, expect } from 'vitest'
import { BACKGROUNDS, DEFAULT_BACKGROUND, type Background, type BackgroundPattern } from './backgrounds'

const VALID_PATTERNS: BackgroundPattern[] = ['dots', 'lines', 'grid', 'solid', 'gradient', 'image', 'photos']

describe('backgrounds constants', () => {
  describe('BACKGROUNDS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(BACKGROUNDS)).toBe(true)
      expect(BACKGROUNDS.length).toBeGreaterThan(0)
    })

    it('every background has a non-empty label string', () => {
      for (const bg of BACKGROUNDS) {
        expect(typeof bg.label).toBe('string')
        expect(bg.label.length).toBeGreaterThan(0)
      }
    })

    it('every background has a non-empty bg (color) string', () => {
      for (const bg of BACKGROUNDS) {
        expect(typeof bg.bg).toBe('string')
        expect(bg.bg.length).toBeGreaterThan(0)
      }
    })

    it('every background has a non-empty dot string', () => {
      for (const bg of BACKGROUNDS) {
        expect(typeof bg.dot).toBe('string')
        expect(bg.dot.length).toBeGreaterThan(0)
      }
    })

    it('all labels are unique', () => {
      const labels = BACKGROUNDS.map((b) => b.label)
      const unique = new Set(labels)
      expect(unique.size).toBe(labels.length)
    })

    it('bg and dot fields are valid hex color strings', () => {
      const hexPattern = /^#[0-9a-fA-F]{3,8}$/
      for (const bg of BACKGROUNDS) {
        expect(bg.bg).toMatch(hexPattern)
        expect(bg.dot).toMatch(hexPattern)
      }
    })

    it('pattern field is one of the allowed values when present', () => {
      for (const bg of BACKGROUNDS) {
        if (bg.pattern !== undefined) {
          expect(VALID_PATTERNS).toContain(bg.pattern)
        }
      }
    })

    it('gradient backgrounds have a gradientTo field that is a hex color', () => {
      const hexPattern = /^#[0-9a-fA-F]{3,8}$/
      const gradients = BACKGROUNDS.filter((b) => b.pattern === 'gradient')
      expect(gradients.length).toBeGreaterThan(0)
      for (const bg of gradients) {
        expect(typeof bg.gradientTo).toBe('string')
        expect(bg.gradientTo).toMatch(hexPattern)
      }
    })

    it('image backgrounds have an imageUrl field when present', () => {
      const images = BACKGROUNDS.filter((b) => b.pattern === 'image')
      for (const bg of images) {
        expect(typeof bg.imageUrl).toBe('string')
      }
    })

    it('optional numeric fields are positive numbers when set', () => {
      for (const bg of BACKGROUNDS) {
        if (bg.imageDim !== undefined) {
          expect(typeof bg.imageDim).toBe('number')
          expect(bg.imageDim).toBeGreaterThanOrEqual(0)
          expect(bg.imageDim).toBeLessThanOrEqual(1)
        }
        if (bg.photoInterval !== undefined) {
          expect(typeof bg.photoInterval).toBe('number')
          expect(bg.photoInterval).toBeGreaterThan(0)
        }
      }
    })

    it('includes dot-grid backgrounds (no explicit pattern)', () => {
      const dotGrids = BACKGROUNDS.filter((b) => b.pattern === undefined)
      expect(dotGrids.length).toBeGreaterThan(0)
    })

    it('includes line pattern backgrounds', () => {
      const lines = BACKGROUNDS.filter((b) => b.pattern === 'lines')
      expect(lines.length).toBeGreaterThan(0)
    })

    it('includes grid pattern backgrounds', () => {
      const grids = BACKGROUNDS.filter((b) => b.pattern === 'grid')
      expect(grids.length).toBeGreaterThan(0)
    })

    it('includes solid pattern backgrounds', () => {
      const solids = BACKGROUNDS.filter((b) => b.pattern === 'solid')
      expect(solids.length).toBeGreaterThan(0)
    })
  })

  describe('DEFAULT_BACKGROUND', () => {
    it('is the first element of BACKGROUNDS', () => {
      expect(DEFAULT_BACKGROUND).toBe(BACKGROUNDS[0])
    })

    it('has required shape fields', () => {
      expect(typeof DEFAULT_BACKGROUND.label).toBe('string')
      expect(typeof DEFAULT_BACKGROUND.bg).toBe('string')
      expect(typeof DEFAULT_BACKGROUND.dot).toBe('string')
    })
  })
})
