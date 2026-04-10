import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './theme'

// Mock applyThemeVars since it touches document.documentElement in jsdom
vi.mock('../themes/presets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../themes/presets')>()
  return {
    ...actual,
    applyThemeVars: vi.fn(),
  }
})

const store = () => useThemeStore.getState()

beforeEach(() => {
  useThemeStore.setState(useThemeStore.getInitialState(), true)
})

describe('initial state', () => {
  it('starts with minimal theme', () => {
    expect(store().activeThemeId).toBe('minimal')
    expect(store().customOverrides).toEqual({})
    expect(store().customTheme).toBeNull()
    expect(store().petsEnabled).toBe(false)
  })
})

describe('setTheme', () => {
  it('switches active theme and clears overrides', () => {
    store().setOverride('widgetBg', '#fff')
    store().setTheme('slate')
    expect(store().activeThemeId).toBe('slate')
    expect(store().customOverrides).toEqual({})
    expect(store().customTheme).toBeNull()
  })
})

describe('setOverride', () => {
  it('stores a single override', () => {
    store().setOverride('widgetBg', '#123456')
    expect(store().customOverrides.widgetBg).toBe('#123456')
  })

  it('accumulates overrides', () => {
    store().setOverride('widgetBg', '#111')
    store().setOverride('widgetText', '#222')
    expect(store().customOverrides).toEqual({ widgetBg: '#111', widgetText: '#222' })
  })
})

describe('clearOverrides', () => {
  it('resets overrides to empty', () => {
    store().setOverride('widgetBg', '#111')
    store().clearOverrides()
    expect(store().customOverrides).toEqual({})
  })
})

describe('setCustomTheme', () => {
  it('sets a custom theme and switches activeThemeId to custom', () => {
    store().setCustomTheme({ widgetBg: '#ff0000' })
    expect(store().activeThemeId).toBe('custom')
    expect(store().customTheme).toBeDefined()
    expect(store().customTheme!.widgetBg).toBe('#ff0000')
  })

  it('merges with a base theme', () => {
    store().setCustomTheme({ widgetBg: '#ff0000' }, undefined, 'minimal')
    expect(store().customTheme).toBeDefined()
    // Should have all vars from minimal base plus the override
    expect(store().customTheme!.widgetBg).toBe('#ff0000')
  })
})

describe('setBackground', () => {
  it('updates the background', () => {
    const bg = { label: 'Custom', bg: '#000', dot: '#fff' }
    store().setBackground(bg)
    expect(store().background).toEqual(bg)
  })
})

describe('setPetsEnabled', () => {
  it('toggles pets', () => {
    store().setPetsEnabled(true)
    expect(store().petsEnabled).toBe(true)
    store().setPetsEnabled(false)
    expect(store().petsEnabled).toBe(false)
  })
})
