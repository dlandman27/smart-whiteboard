import { describe, it, expect } from 'vitest'
import { SPRITES, PX, getSpriteType } from './sprites'

describe('sprites.ts — SPRITES data', () => {
  const EXPECTED_AGENTS = [
    'cat', 'dog', 'robot', 'bunny', 'ghost', 'owl', 'bear', 'frog',
    'penguin', 'alien', 'dragon', 'fox', 'wizard', 'ninja', 'dino', 'astronaut',
  ]

  it('exports PX as a positive number', () => {
    expect(typeof PX).toBe('number')
    expect(PX).toBeGreaterThan(0)
  })

  it('exports SPRITES as a non-empty object', () => {
    expect(typeof SPRITES).toBe('object')
    expect(Object.keys(SPRITES).length).toBeGreaterThan(0)
  })

  it('contains all expected sprite keys', () => {
    for (const key of EXPECTED_AGENTS) {
      expect(SPRITES).toHaveProperty(key)
    }
  })

  it.each(EXPECTED_AGENTS)('sprite "%s" has correct shape', (key) => {
    const sprite = SPRITES[key]
    expect(sprite).toBeDefined()

    // frames array with exactly 3 entries
    expect(Array.isArray(sprite.frames)).toBe(true)
    expect(sprite.frames).toHaveLength(3)

    // each frame is an array of strings
    for (const frame of sprite.frames) {
      expect(Array.isArray(frame)).toBe(true)
      expect(frame.length).toBeGreaterThan(0)
      for (const row of frame) {
        expect(typeof row).toBe('string')
        // each row should be 8 chars wide (the sprite width)
        expect(row.length).toBe(sprite.width)
      }
    }
  })

  it.each(EXPECTED_AGENTS)('sprite "%s" has valid colors map', (key) => {
    const sprite = SPRITES[key]
    expect(typeof sprite.colors).toBe('object')
    expect(Object.keys(sprite.colors).length).toBeGreaterThan(0)
    for (const [colorKey, colorValue] of Object.entries(sprite.colors)) {
      expect(typeof colorKey).toBe('string')
      expect(typeof colorValue).toBe('string')
      // color values should look like hex strings
      expect(colorValue).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    }
  })

  it.each(EXPECTED_AGENTS)('sprite "%s" has positive width and height', (key) => {
    const sprite = SPRITES[key]
    expect(typeof sprite.width).toBe('number')
    expect(sprite.width).toBeGreaterThan(0)
    expect(typeof sprite.height).toBe('number')
    expect(sprite.height).toBeGreaterThan(0)
  })

  it.each(EXPECTED_AGENTS)('sprite "%s" frame rows match declared height', (key) => {
    const sprite = SPRITES[key]
    for (const frame of sprite.frames) {
      expect(frame).toHaveLength(sprite.height)
    }
  })

  it('all three walk frames for cat are distinct', () => {
    const { frames } = SPRITES.cat
    // frame 1 and 2 should differ (walking legs)
    expect(frames[1]).not.toEqual(frames[2])
  })
})

describe('getSpriteType', () => {
  it('returns spriteType when explicitly provided and valid', () => {
    expect(getSpriteType('unknown-agent', '🤖', 'dragon')).toBe('dragon')
  })

  it('ignores invalid spriteType and falls back to agentId mapping', () => {
    expect(getSpriteType('task-monitor', '📋', 'not-a-sprite')).toBe('dog')
  })

  it('maps known agentIds to correct sprites', () => {
    expect(getSpriteType('task-monitor',       '📋')).toBe('dog')
    expect(getSpriteType('calendar-agent',     '📅')).toBe('cat')
    expect(getSpriteType('focus-agent',        '🎯')).toBe('robot')
    expect(getSpriteType('routine-agent',      '🔁')).toBe('bunny')
    expect(getSpriteType('meeting-countdown',  '⏰')).toBe('owl')
    expect(getSpriteType('end-of-day',         '🌙')).toBe('bear')
    expect(getSpriteType('stale-task-cleanup', '🧹')).toBe('ghost')
    expect(getSpriteType('hydration-reminder', '💧')).toBe('frog')
    expect(getSpriteType('break-reminder',     '🛑')).toBe('bunny')
  })

  it('maps icon emoji to correct sprite type', () => {
    expect(getSpriteType('some-agent', '🐱')).toBe('cat')
    expect(getSpriteType('some-agent', '🐶')).toBe('dog')
    expect(getSpriteType('some-agent', '🤖')).toBe('robot')
    expect(getSpriteType('some-agent', '🐰')).toBe('bunny')
    expect(getSpriteType('some-agent', '👻')).toBe('ghost')
    expect(getSpriteType('some-agent', '🦉')).toBe('owl')
    expect(getSpriteType('some-agent', '🐻')).toBe('bear')
    expect(getSpriteType('some-agent', '🐸')).toBe('frog')
    expect(getSpriteType('some-agent', '🐧')).toBe('penguin')
    expect(getSpriteType('some-agent', '👽')).toBe('alien')
  })

  it('falls back to deterministic hash for unknown agentId and icon', () => {
    const result = getSpriteType('my-custom-agent', '❓')
    expect(Object.keys(SPRITES)).toContain(result)
  })

  it('always returns a key that exists in SPRITES', () => {
    const ids = ['any-id', 'another', 'test-agent']
    for (const id of ids) {
      const result = getSpriteType(id, '?')
      expect(SPRITES).toHaveProperty(result)
    }
  })
})
