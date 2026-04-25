import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { THEMES, THEME_MAP, CSS_VAR_MAP, applyThemeVars, VAR_LABELS } from './presets'
import type { ThemeVars } from './presets'

describe('THEMES presets', () => {
  it('exports a non-empty array of themes', () => {
    expect(THEMES.length).toBeGreaterThan(0)
  })

  it('every theme has required fields', () => {
    for (const theme of THEMES) {
      expect(typeof theme.id).toBe('string')
      expect(typeof theme.name).toBe('string')
      expect(typeof theme.emoji).toBe('string')
      expect(typeof theme.dark).toBe('boolean')
      expect(Array.isArray(theme.previewColors)).toBe(true)
      expect(theme.previewColors).toHaveLength(4)
      expect(theme.vars).toBeDefined()
      expect(theme.background).toBeDefined()
    }
  })

  it('all theme IDs are unique', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has expected named themes', () => {
    const ids = THEMES.map((t) => t.id)
    expect(ids).toContain('dracula')
    expect(ids).toContain('slate')
    expect(ids).toContain('midnight')
    expect(ids).toContain('paper')
  })
})

describe('THEME_MAP', () => {
  it('maps each theme id to its theme object', () => {
    for (const theme of THEMES) {
      expect(THEME_MAP[theme.id]).toBe(theme)
    }
  })
})

describe('CSS_VAR_MAP', () => {
  it('every entry starts with --wt-', () => {
    for (const [, cssVar] of Object.entries(CSS_VAR_MAP)) {
      expect(cssVar).toMatch(/^--wt-/)
    }
  })

  it('covers all keys of ThemeVars', () => {
    // Spot-check key presence
    const keys = Object.keys(CSS_VAR_MAP) as (keyof ThemeVars)[]
    expect(keys).toContain('widgetBg')
    expect(keys).toContain('accent')
    expect(keys).toContain('textPrimary')
    expect(keys).toContain('danger')
  })
})

describe('VAR_LABELS', () => {
  it('is an object with string label values', () => {
    for (const [, label] of Object.entries(VAR_LABELS)) {
      expect(typeof label).toBe('string')
    }
  })
})

describe('applyThemeVars', () => {
  let setPropertySpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.documentElement.classList.remove('theme-transitioning')
  })

  it('calls setProperty for every CSS var in the map', () => {
    const theme = THEMES[0]
    applyThemeVars(theme.vars)
    const expectedCount = Object.keys(CSS_VAR_MAP).length
    expect(setPropertySpy).toHaveBeenCalledTimes(expectedCount)
  })

  it('adds theme-transitioning class then removes it after 450ms', () => {
    applyThemeVars(THEMES[0].vars)
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true)

    vi.advanceTimersByTime(450)
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false)
  })

  it('sets CSS vars with correct variable names', () => {
    const theme = THEMES[0]
    applyThemeVars(theme.vars)

    const callArgs = setPropertySpy.mock.calls.map(([varName]) => varName)
    expect(callArgs).toContain('--wt-bg')
    expect(callArgs).toContain('--wt-accent')
    expect(callArgs).toContain('--wt-text')
  })
})
