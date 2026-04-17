import { describe, it, expect } from 'vitest'
import { LAYOUT_PRESETS, DEFAULT_LAYOUT_ID, getLayoutPreset } from './presets'

describe('LAYOUT_PRESETS', () => {
  it('exports a non-empty array', () => {
    expect(LAYOUT_PRESETS.length).toBeGreaterThan(0)
  })

  it('every preset has id, name, and slots fields', () => {
    for (const preset of LAYOUT_PRESETS) {
      expect(typeof preset.id).toBe('string')
      expect(typeof preset.name).toBe('string')
      expect(Array.isArray(preset.slots)).toBe(true)
    }
  })

  it('all preset IDs are unique', () => {
    const ids = LAYOUT_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('slot dimensions are valid (0 ≤ x,y ≤ 1, width/height > 0)', () => {
    for (const preset of LAYOUT_PRESETS) {
      for (const slot of preset.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0)
        expect(slot.x).toBeLessThanOrEqual(1)
        expect(slot.y).toBeGreaterThanOrEqual(0)
        expect(slot.y).toBeLessThanOrEqual(1)
        expect(slot.width).toBeGreaterThan(0)
        expect(slot.height).toBeGreaterThan(0)
        // Slot should not exceed canvas bounds
        expect(slot.x + slot.width).toBeLessThanOrEqual(1.001) // tiny float tolerance
        expect(slot.y + slot.height).toBeLessThanOrEqual(1.001)
      }
    }
  })

  it('every slot within a preset has a unique id', () => {
    for (const preset of LAYOUT_PRESETS) {
      const slotIds = preset.slots.map((s) => s.id)
      expect(new Set(slotIds).size).toBe(slotIds.length)
    }
  })

  it('includes expected preset IDs', () => {
    const ids = LAYOUT_PRESETS.map((p) => p.id)
    expect(ids).toContain('dashboard')
    expect(ids).toContain('freeform')
    expect(ids).toContain('focus')
    expect(ids).toContain('grid-2x2')
  })
})

describe('DEFAULT_LAYOUT_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_LAYOUT_ID).toBe('string')
    expect(DEFAULT_LAYOUT_ID.length).toBeGreaterThan(0)
  })

  it('matches an existing preset', () => {
    const ids = LAYOUT_PRESETS.map((p) => p.id)
    expect(ids).toContain(DEFAULT_LAYOUT_ID)
  })
})

describe('getLayoutPreset', () => {
  it('returns the matching preset by id', () => {
    const preset = getLayoutPreset('focus')
    expect(preset.id).toBe('focus')
    expect(preset.slots).toHaveLength(1)
  })

  it('returns the first preset (freeform) for an unknown id', () => {
    const preset = getLayoutPreset('nonexistent-id')
    expect(preset).toBe(LAYOUT_PRESETS[0])
  })

  it('returns dashboard preset', () => {
    const preset = getLayoutPreset('dashboard')
    expect(preset.id).toBe('dashboard')
    expect(preset.slots.length).toBeGreaterThan(0)
  })

  it('returns grid-2x2 with 4 slots', () => {
    const preset = getLayoutPreset('grid-2x2')
    expect(preset.slots).toHaveLength(4)
  })
})
