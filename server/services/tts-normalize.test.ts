import { describe, it, expect } from 'vitest'
import { normalizeTtsText } from './tts-normalize.js'

describe('normalizeTtsText', () => {
  // ── Basic passthrough ────────────────────────────────────────────────────────
  it('returns plain text unchanged (except trailing period)', () => {
    expect(normalizeTtsText('Hello world')).toBe('Hello world.')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeTtsText('')).toBe('')
  })

  it('preserves text that already ends with a period', () => {
    expect(normalizeTtsText('Hello world.')).toBe('Hello world.')
  })

  it('preserves text that ends with exclamation mark', () => {
    expect(normalizeTtsText('Hello world!')).toBe('Hello world!')
  })

  it('preserves text that ends with question mark', () => {
    expect(normalizeTtsText('Hello world?')).toBe('Hello world?')
  })

  // ── Markdown stripping ───────────────────────────────────────────────────────
  it('strips markdown code fences', () => {
    const result = normalizeTtsText('Here is code:\n```js\nconst x = 1\n```\nDone.')
    expect(result).not.toContain('```')
    expect(result).not.toContain('const x = 1')
    expect(result).toContain('Here is code')
  })

  it('strips inline code', () => {
    const result = normalizeTtsText('Call `myFunction()` to do it.')
    expect(result).not.toContain('`')
    expect(result).not.toContain('myFunction()')
  })

  it('strips markdown images', () => {
    const result = normalizeTtsText('See this: ![alt text](https://example.com/img.png)')
    expect(result).not.toContain('![')
    expect(result).not.toContain('https://example.com/img.png')
  })

  it('replaces markdown links with just the link text', () => {
    const result = normalizeTtsText('Visit [Google](https://google.com) now.')
    expect(result).toContain('Google')
    expect(result).not.toContain('[Google]')
    expect(result).not.toContain('https://google.com')
  })

  it('strips bare URLs', () => {
    const result = normalizeTtsText('Visit https://example.com/page?foo=bar&baz=1 for more.')
    expect(result).not.toContain('https://')
    expect(result).toContain('a link')
  })

  it('strips http URLs too', () => {
    const result = normalizeTtsText('See http://example.com')
    expect(result).not.toContain('http://example.com')
    expect(result).toContain('a link')
  })

  it('strips bold markdown (**text**)', () => {
    const result = normalizeTtsText('This is **bold** text.')
    expect(result).not.toContain('**')
    expect(result).toContain('bold')
  })

  it('strips bold markdown (__text__)', () => {
    const result = normalizeTtsText('This is __bold__ text.')
    expect(result).not.toContain('__')
    expect(result).toContain('bold')
  })

  it('strips italic markdown (*text*)', () => {
    const result = normalizeTtsText('This is *italic* text.')
    expect(result).not.toContain('*')
    expect(result).toContain('italic')
  })

  it('strips italic markdown (_text_)', () => {
    const result = normalizeTtsText('This is _italic_ text.')
    expect(result).not.toContain('_italic_')
    expect(result).toContain('italic')
  })

  it('strips markdown headers (#)', () => {
    const result = normalizeTtsText('# Heading One\nsome text.')
    expect(result).not.toContain('#')
    expect(result).toContain('Heading One')
  })

  it('strips all heading levels', () => {
    const input = '## H2\n### H3\n#### H4\ntext.'
    const result = normalizeTtsText(input)
    expect(result).not.toContain('#')
    expect(result).toContain('H2')
    expect(result).toContain('H3')
  })

  it('replaces bullet list markers with comma pause', () => {
    const result = normalizeTtsText('- item one\n- item two')
    expect(result).not.toMatch(/^- /)
  })

  it('replaces asterisk list markers', () => {
    const result = normalizeTtsText('* item one\n* item two')
    expect(result).not.toMatch(/^\* /)
  })

  it('replaces numbered list markers', () => {
    const result = normalizeTtsText('1. first item\n2. second item')
    expect(result).not.toMatch(/\d\. /)
  })

  it('replaces horizontal rules with period', () => {
    const result = normalizeTtsText('Before\n---\nAfter.')
    expect(result).not.toContain('---')
  })

  // ── Emoji stripping ──────────────────────────────────────────────────────────
  it('strips common emoji', () => {
    const result = normalizeTtsText('Hello 😀 world 🎉.')
    expect(result).not.toContain('😀')
    expect(result).not.toContain('🎉')
    expect(result).toContain('Hello')
    expect(result).toContain('world')
  })

  // ── Symbol replacements ──────────────────────────────────────────────────────
  it('replaces & with "and"', () => {
    const result = normalizeTtsText('salt & pepper.')
    expect(result).toContain('and')
    expect(result).not.toContain('&')
  })

  it('replaces &amp; with "and"', () => {
    const result = normalizeTtsText('salt &amp; pepper.')
    expect(result).toContain('and')
    expect(result).not.toContain('&amp;')
  })

  it('replaces → with "to"', () => {
    const result = normalizeTtsText('Go A → B.')
    expect(result).toContain('to')
    expect(result).not.toContain('→')
  })

  it('replaces => with "to"', () => {
    const result = normalizeTtsText('A => B.')
    expect(result).toContain('to')
  })

  it('replaces -> with "to"', () => {
    const result = normalizeTtsText('A -> B.')
    expect(result).toContain('to')
  })

  it('replaces ← with "from"', () => {
    const result = normalizeTtsText('B ← A.')
    expect(result).toContain('from')
    expect(result).not.toContain('←')
  })

  it('replaces °C with "degrees Celsius"', () => {
    const result = normalizeTtsText('Temperature: 25°C.')
    expect(result).toContain('degrees Celsius')
    expect(result).not.toContain('°')
  })

  it('replaces °F with "degrees Fahrenheit"', () => {
    const result = normalizeTtsText('Temperature: 98°F.')
    expect(result).toContain('degrees Fahrenheit')
  })

  it('replaces standalone ° with "degrees"', () => {
    const result = normalizeTtsText('45° angle.')
    expect(result).toContain('degrees')
    expect(result).not.toContain('°')
  })

  it('replaces $ with "dollars"', () => {
    const result = normalizeTtsText('It costs $50.')
    expect(result).toContain('dollars')
    expect(result).not.toContain('$')
  })

  it('replaces € with "euros"', () => {
    const result = normalizeTtsText('It costs €50.')
    expect(result).toContain('euros')
    expect(result).not.toContain('€')
  })

  it('replaces £ with "pounds"', () => {
    const result = normalizeTtsText('It costs £50.')
    expect(result).toContain('pounds')
    expect(result).not.toContain('£')
  })

  it('replaces % with "percent"', () => {
    const result = normalizeTtsText('50% done.')
    expect(result).toContain('percent')
    expect(result).not.toContain('%')
  })

  it('replaces + with "plus"', () => {
    const result = normalizeTtsText('3+4.')
    expect(result).toContain('plus')
    expect(result).not.toContain('+')
  })

  it('replaces × with "times"', () => {
    const result = normalizeTtsText('3 × 4.')
    expect(result).toContain('times')
    expect(result).not.toContain('×')
  })

  it('replaces ÷ with "divided by"', () => {
    const result = normalizeTtsText('8 ÷ 2.')
    expect(result).toContain('divided by')
    expect(result).not.toContain('÷')
  })

  it('replaces ≈ with "approximately"', () => {
    const result = normalizeTtsText('x ≈ 3.14.')
    expect(result).toContain('approximately')
    expect(result).not.toContain('≈')
  })

  it('replaces ≠ with "not equal to"', () => {
    const result = normalizeTtsText('x ≠ y.')
    expect(result).toContain('not equal to')
    expect(result).not.toContain('≠')
  })

  it('replaces ≤ with "less than or equal to"', () => {
    const result = normalizeTtsText('x ≤ 5.')
    expect(result).toContain('less than or equal to')
  })

  it('replaces ≥ with "greater than or equal to"', () => {
    const result = normalizeTtsText('x ≥ 5.')
    expect(result).toContain('greater than or equal to')
  })

  it('replaces ... (ellipsis) with comma', () => {
    const result = normalizeTtsText('Wait...')
    expect(result).not.toContain('...')
  })

  it('replaces unicode ellipsis … with comma', () => {
    const result = normalizeTtsText('Wait… and see.')
    expect(result).not.toContain('…')
  })

  // ── Ordinal numbers ──────────────────────────────────────────────────────────
  it('converts 1st to "first"', () => {
    const result = normalizeTtsText('She finished 1st.')
    expect(result).toContain('first')
    expect(result).not.toContain('1st')
  })

  it('converts 2nd to "second"', () => {
    const result = normalizeTtsText('He came 2nd.')
    expect(result).toContain('second')
  })

  it('converts 3rd to "third"', () => {
    expect(normalizeTtsText('3rd place.')).toContain('third')
  })

  it('converts 4th to "fourth"', () => {
    expect(normalizeTtsText('4th floor.')).toContain('fourth')
  })

  it('converts 11th to "eleventh"', () => {
    expect(normalizeTtsText('The 11th day.')).toContain('eleventh')
  })

  it('converts 12th to "twelfth"', () => {
    expect(normalizeTtsText('The 12th item.')).toContain('twelfth')
  })

  it('converts 21st to "twenty-first"', () => {
    expect(normalizeTtsText('The 21st century.')).toContain('twenty-first')
  })

  it('converts 31st to "thirty-first"', () => {
    expect(normalizeTtsText('The 31st.')).toContain('thirty-first')
  })

  it('converts 30th to "thirtieth"', () => {
    expect(normalizeTtsText('The 30th.')).toContain('thirtieth')
  })

  it('converts ordinals with TH (uppercase)', () => {
    // Case insensitive flag
    const result = normalizeTtsText('The 5TH element.')
    expect(result).toContain('fifth')
  })

  it('falls back to Nth for numbers beyond the table', () => {
    // 99th is not in the ORDINALS table, should produce "99th" (unchanged)
    const result = normalizeTtsText('The 99th percentile.')
    // After ordinal replacement, 99th → "99th" (spokenOrdinal fallback)
    // then special char stripping removes nothing, so it stays
    expect(result).toContain('99th')
  })

  // ── Whitespace collapsing ────────────────────────────────────────────────────
  it('collapses multiple spaces into one', () => {
    const result = normalizeTtsText('Hello   world.')
    expect(result).toBe('Hello world.')
  })

  it('collapses multiple newlines into sentence pause', () => {
    const result = normalizeTtsText('Para one\n\nPara two.')
    expect(result).not.toMatch(/\n/)
    expect(result).toContain('Para one')
    expect(result).toContain('Para two')
  })

  it('converts single newlines to spaces', () => {
    const result = normalizeTtsText('Line one\nLine two.')
    expect(result).not.toContain('\n')
    expect(result).toContain('Line one')
    expect(result).toContain('Line two')
  })

  it('trims leading and trailing whitespace', () => {
    const result = normalizeTtsText('  Hello world  ')
    expect(result).toBe('Hello world.')
  })

  // ── Complex / combined scenarios ─────────────────────────────────────────────
  it('handles a complex markdown document', () => {
    const input = `# My Title\n\nThis is **bold** and _italic_ text.\n\n- Item one\n- Item two\n\nVisit [link](https://example.com).`
    const result = normalizeTtsText(input)
    expect(result).not.toContain('#')
    expect(result).not.toContain('**')
    expect(result).not.toContain('_')
    expect(result).not.toContain('[')
    expect(result).not.toContain('https://')
    expect(result).toContain('My Title')
    expect(result).toContain('bold')
    expect(result).toContain('italic')
    expect(result).toContain('link')
  })
})
