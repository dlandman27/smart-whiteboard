import { describe, it, expect } from 'vitest'
import {
  DRAWING_COLORS,
  STROKE_WIDTHS,
  DEFAULT_COLOR,
  DEFAULT_STROKE,
  DEFAULT_ERASER_SIZE,
} from './drawing'

describe('drawing constants', () => {
  describe('DRAWING_COLORS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(DRAWING_COLORS)).toBe(true)
      expect(DRAWING_COLORS.length).toBeGreaterThan(0)
    })

    it('every color is a non-empty string', () => {
      for (const color of DRAWING_COLORS) {
        expect(typeof color).toBe('string')
        expect(color.length).toBeGreaterThan(0)
      }
    })

    it('every color is a valid hex color string', () => {
      const hexPattern = /^#[0-9a-fA-F]{3,8}$/
      for (const color of DRAWING_COLORS) {
        expect(color).toMatch(hexPattern)
      }
    })

    it('all colors are unique', () => {
      const unique = new Set(DRAWING_COLORS)
      expect(unique.size).toBe(DRAWING_COLORS.length)
    })
  })

  describe('STROKE_WIDTHS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(STROKE_WIDTHS)).toBe(true)
      expect(STROKE_WIDTHS.length).toBeGreaterThan(0)
    })

    it('every entry has a numeric value > 0', () => {
      for (const sw of STROKE_WIDTHS) {
        expect(typeof sw.value).toBe('number')
        expect(sw.value).toBeGreaterThan(0)
      }
    })

    it('every entry has a non-empty dot string (Tailwind classes)', () => {
      for (const sw of STROKE_WIDTHS) {
        expect(typeof sw.dot).toBe('string')
        expect(sw.dot.trim().length).toBeGreaterThan(0)
      }
    })

    it('stroke values are in ascending order', () => {
      for (let i = 1; i < STROKE_WIDTHS.length; i++) {
        expect(STROKE_WIDTHS[i].value).toBeGreaterThan(STROKE_WIDTHS[i - 1].value)
      }
    })
  })

  describe('DEFAULT_COLOR', () => {
    it('is a string', () => {
      expect(typeof DEFAULT_COLOR).toBe('string')
    })

    it('is the first entry of DRAWING_COLORS', () => {
      expect(DEFAULT_COLOR).toBe(DRAWING_COLORS[0])
    })
  })

  describe('DEFAULT_STROKE', () => {
    it('is a positive number', () => {
      expect(typeof DEFAULT_STROKE).toBe('number')
      expect(DEFAULT_STROKE).toBeGreaterThan(0)
    })

    it('matches one of the STROKE_WIDTHS values', () => {
      const values = STROKE_WIDTHS.map((sw) => sw.value)
      expect(values).toContain(DEFAULT_STROKE)
    })
  })

  describe('DEFAULT_ERASER_SIZE', () => {
    it('is a positive number', () => {
      expect(typeof DEFAULT_ERASER_SIZE).toBe('number')
      expect(DEFAULT_ERASER_SIZE).toBeGreaterThan(0)
    })
  })
})
