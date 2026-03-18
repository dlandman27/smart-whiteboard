// ── Semantic typography tokens ────────────────────────────────────────────────
// All values reference primitives — never hardcoded.
// Fixes applied vs. Figma export:
//   • body.medium line-height was tight (1.2) — corrected to relaxed (1.6)
//   • label.medium / label.small inferred (Figma export was truncated)
//   • caption variant added (not in Figma export)

import {
  fontSize  as fs,
  fontWeight as fw,
  lineHeight as lh,
  fontFamily as ff,
} from './primitives'

export interface TypographyStyle {
  fontSize:       string
  lineHeight:     string
  fontWeight:     string
  fontFamily:     string
  letterSpacing?: string
}

export type TextVariant = 'display' | 'heading' | 'title' | 'body' | 'label' | 'caption'
export type TextSize    = 'large' | 'medium' | 'small'

export const typography: Record<TextVariant, Record<TextSize, TypographyStyle>> = {
  display: {
    large:  { fontSize: fs['5xl'], lineHeight: lh.tight,   fontWeight: fw.medium,   fontFamily: ff.base, letterSpacing: '-0.02em'  },
    medium: { fontSize: fs['4xl'], lineHeight: lh.tight,   fontWeight: fw.regular,  fontFamily: ff.base, letterSpacing: '-0.02em'  },
    small:  { fontSize: fs['3xl'], lineHeight: lh.normal,  fontWeight: fw.regular,  fontFamily: ff.base, letterSpacing: '-0.015em' },
  },
  heading: {
    large:  { fontSize: fs['3xl'], lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
    medium: { fontSize: fs['2xl'], lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
    small:  { fontSize: fs['xl'],  lineHeight: lh.normal,  fontWeight: fw.semiBold, fontFamily: ff.base },
  },
  title: {
    large:  { fontSize: fs['2xl'], lineHeight: lh.normal,  fontWeight: fw.medium,   fontFamily: ff.base },
    medium: { fontSize: fs['md'],  lineHeight: lh.normal,  fontWeight: fw.medium,   fontFamily: ff.base },
    small:  { fontSize: fs['sm'],  lineHeight: lh.relaxed, fontWeight: fw.medium,   fontFamily: ff.base },
  },
  body: {
    large:  { fontSize: fs['md'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base },
    medium: { fontSize: fs['sm'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base }, // fixed: was tight in Figma
    small:  { fontSize: fs['xs'],  lineHeight: lh.relaxed, fontWeight: fw.regular,  fontFamily: ff.base },
  },
  label: {
    large:  { fontSize: fs['sm'],  lineHeight: lh.normal,  fontWeight: fw.medium,   fontFamily: ff.base },
    medium: { fontSize: fs['xs'],  lineHeight: lh.normal,  fontWeight: fw.medium,   fontFamily: ff.base, letterSpacing: '0.02em' },
    small:  { fontSize: fs['2xs'], lineHeight: lh.normal,  fontWeight: fw.medium,   fontFamily: ff.base, letterSpacing: '0.04em' },
  },
  caption: {
    large:  { fontSize: fs['xs'],  lineHeight: lh.normal,  fontWeight: fw.regular,  fontFamily: ff.base },
    medium: { fontSize: fs['2xs'], lineHeight: lh.normal,  fontWeight: fw.regular,  fontFamily: ff.base },
    small:  { fontSize: fs['2xs'], lineHeight: lh.normal,  fontWeight: fw.regular,  fontFamily: ff.base, letterSpacing: '0.01em' },
  },
}
