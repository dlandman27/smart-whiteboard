import fontFamilyTokens from './fontFamily.json'
import fontSizeTokens   from './fontSize.json'
import fontWeightTokens from './fontWeight.json'
import lineHeightTokens from './lineHeight.json'

// ── Token helpers ─────────────────────────────────────────────────────────────

const px = (n: number) => `${n / 16}rem`

const ff = {
  base:    fontFamilyTokens.base.join(', '),
  display: fontFamilyTokens.display.join(', '),
  mono:    fontFamilyTokens.mono.join(', '),
}

const fs = Object.fromEntries(
  Object.entries(fontSizeTokens).map(([k, v]) => [k, px(v as number)])
) as Record<keyof typeof fontSizeTokens, string>

const fw = Object.fromEntries(
  Object.entries(fontWeightTokens).map(([k, v]) => [k, String(v)])
) as Record<keyof typeof fontWeightTokens, string>

const lh = Object.fromEntries(
  Object.entries(lineHeightTokens).map(([k, v]) => [k, String(v)])
) as Record<keyof typeof lineHeightTokens, string>

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TypographyStyle {
  fontSize:       string
  lineHeight:     string
  fontWeight:     string
  fontFamily:     string
  letterSpacing?: string
}

export type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'label' | 'caption'
export type TextSize    = 'large' | 'medium' | 'small'

// ── Scale ─────────────────────────────────────────────────────────────────────

export const typography: Record<TextVariant, Record<TextSize, TypographyStyle>> = {
  display: {
    large:  { fontSize: fs['5xl'], lineHeight: lh.tight,   fontWeight: fw.bold,     fontFamily: ff.display, letterSpacing: '-0.02em'  },
    medium: { fontSize: fs['4xl'], lineHeight: lh.tight,   fontWeight: fw.bold,     fontFamily: ff.display, letterSpacing: '-0.02em'  },
    small:  { fontSize: fs['3xl'], lineHeight: lh.tight,   fontWeight: fw.bold,     fontFamily: ff.display, letterSpacing: '-0.015em' },
  },
  heading: {
    large:  { fontSize: fs['2xl'], lineHeight: lh.tight,   fontWeight: fw.bold,     fontFamily: ff.display },
    medium: { fontSize: fs['xl'],  lineHeight: lh.tight,   fontWeight: fw.bold,     fontFamily: ff.display },
    small:  { fontSize: fs['lg'],  lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.display },
  },
  title: {
    large:  { fontSize: fs['xl'],  lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
    medium: { fontSize: fs['md'],  lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
    small:  { fontSize: fs['sm'],  lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
  },
  body: {
    large:  { fontSize: fs['md'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base },
    medium: { fontSize: fs['sm'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base },
    small:  { fontSize: fs['xs'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base },
  },
  label: {
    large:  { fontSize: fs['sm'],    lineHeight: '1', fontWeight: fw.medium, fontFamily: ff.base },
    medium: { fontSize: fs['xs'],    lineHeight: '1', fontWeight: fw.medium, fontFamily: ff.base, letterSpacing: '0.02em' },
    small:  { fontSize: '0.6875rem', lineHeight: '1', fontWeight: fw.medium, fontFamily: ff.base, letterSpacing: '0.04em' },
  },
  caption: {
    large:  { fontSize: fs['xs'],    lineHeight: lh.normal, fontWeight: fw.regular, fontFamily: ff.base },
    medium: { fontSize: '0.6875rem', lineHeight: lh.normal, fontWeight: fw.regular, fontFamily: ff.base },
    small:  { fontSize: '0.625rem',  lineHeight: lh.normal, fontWeight: fw.regular, fontFamily: ff.base },
  },
}
