import { describe, it, expect } from 'vitest'
import { generateScale, complementary, analogous, buildThemeVars } from './scale'

// ── generateScale ────────────────────────────────────────────────────────────

describe('generateScale', () => {
  it('returns all 10 shade steps', () => {
    const scale = generateScale(230, 20)
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
    for (const step of steps) {
      expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('50 is lightest, 900 is darkest', () => {
    const scale = generateScale(230, 20)
    // Convert hex to perceived brightness (simple: sum of RGB)
    const brightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r + g + b
    }
    expect(brightness(scale[50])).toBeGreaterThan(brightness(scale[500]))
    expect(brightness(scale[500])).toBeGreaterThan(brightness(scale[900]))
  })

  it('produces different colors for different hues', () => {
    const blue = generateScale(230, 30)
    const red  = generateScale(0, 30)
    expect(blue[500]).not.toBe(red[500])
  })

  it('saturation 0 produces neutral grays', () => {
    const gray = generateScale(0, 0)
    // With 0 saturation, R === G === B for every step
    for (const step of [50, 500, 900] as const) {
      const r = parseInt(gray[step].slice(1, 3), 16)
      const g = parseInt(gray[step].slice(3, 5), 16)
      const b = parseInt(gray[step].slice(5, 7), 16)
      expect(Math.abs(r - g)).toBeLessThanOrEqual(1)
      expect(Math.abs(g - b)).toBeLessThanOrEqual(1)
    }
  })
})

// ── Hue helpers ──────────────────────────────────────────────────────────────

describe('complementary', () => {
  it('returns 180° opposite', () => {
    expect(complementary(0)).toBe(180)
    expect(complementary(230)).toBe(50)
    expect(complementary(350)).toBe(170)
  })
})

describe('analogous', () => {
  it('returns +30 and -30', () => {
    const [a1, a2] = analogous(230)
    expect(a1).toBe(260)
    expect(a2).toBe(200)
  })

  it('wraps around 360', () => {
    const [a1, a2] = analogous(350)
    expect(a1).toBe(20)
    expect(a2).toBe(320)
  })
})

// ── buildThemeVars ───────────────────────────────────────────────────────────

describe('buildThemeVars', () => {
  const darkInput = {
    primaryHue: 230,
    primarySat: 20,
    complementaryHue: 50,
    complementarySat: 15,
    dark: true,
    accent: '#a0a0ff',
    accentText: '#1a1a2a',
  }

  const lightInput = {
    primaryHue: 230,
    primarySat: 20,
    complementaryHue: 50,
    complementarySat: 15,
    dark: false,
    accent: '#3b82f6',
    accentText: '#ffffff',
  }

  it('returns all required ThemeVars keys', () => {
    const vars = buildThemeVars(darkInput)
    const required: (keyof typeof vars)[] = [
      'widgetBg', 'widgetBorder', 'widgetBorderActive',
      'shadowSm', 'shadowMd', 'shadowLg', 'backdropFilter',
      'textPrimary', 'textMuted',
      'surfaceSubtle', 'surfaceHover', 'surfaceDanger',
      'accent', 'accentText', 'danger',
      'actionBg', 'actionBorder',
      'settingsBg', 'settingsBorder', 'settingsDivider', 'settingsLabel', 'scrollThumb',
      'clockFaceFill', 'clockFaceStroke', 'clockTickMajor', 'clockTickMinor',
      'clockHands', 'clockSecond', 'clockCenter',
      'noteDefaultBg',
      'success', 'info',
    ]
    for (const key of required) {
      expect(vars[key], `missing ${key}`).toBeDefined()
    }
  })

  it('dark theme: surfaceSubtle (canvas) is darker than widgetBg (card)', () => {
    const vars = buildThemeVars(darkInput)
    const brightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r + g + b
    }
    // surfaceSubtle (900) is the canvas behind widgets, widgetBg (800) is the card
    expect(brightness(vars.surfaceSubtle)).toBeLessThan(brightness(vars.widgetBg))
  })

  it('light theme: widgetBg is lighter than surfaceSubtle', () => {
    const vars = buildThemeVars(lightInput)
    const brightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r + g + b
    }
    expect(brightness(vars.widgetBg)).toBeGreaterThan(brightness(vars.surfaceSubtle))
  })

  it('uses complementary scale for note backgrounds', () => {
    const darkVars  = buildThemeVars(darkInput)
    const lightVars = buildThemeVars(lightInput)
    // Note bg should differ from widget bg (comes from complementary, not primary)
    expect(darkVars.noteDefaultBg).not.toBe(darkVars.widgetBg)
    expect(lightVars.noteDefaultBg).not.toBe(lightVars.widgetBg)
  })

  it('hand-picked accent passes through', () => {
    const vars = buildThemeVars(darkInput)
    expect(vars.accent).toBe('#a0a0ff')
    expect(vars.accentText).toBe('#1a1a2a')
  })

  it('clockSecond defaults to accent', () => {
    const vars = buildThemeVars(darkInput)
    expect(vars.clockSecond).toBe(vars.accent)
  })

  it('allows override of clockSecond', () => {
    const vars = buildThemeVars({ ...darkInput, clockSecond: '#ff0000' })
    expect(vars.clockSecond).toBe('#ff0000')
  })
})

// ── Visual sanity: log a scale for manual inspection ─────────────────────────

describe('visual sanity', () => {
  it('Dracula-adjacent primary produces reasonable hex values', () => {
    // Dracula bg is #282a36, which is roughly hue 233, sat 15, lightness ~18
    const scale = generateScale(233, 15)

    // 900 should be in the #20-#30 range (dark)
    const r900 = parseInt(scale[900].slice(1, 3), 16)
    expect(r900).toBeGreaterThanOrEqual(0x18)
    expect(r900).toBeLessThanOrEqual(0x38)

    // 50 should be in the #e0-#ff range (light)
    const r50 = parseInt(scale[50].slice(1, 3), 16)
    expect(r50).toBeGreaterThanOrEqual(0xe0)
  })
})
