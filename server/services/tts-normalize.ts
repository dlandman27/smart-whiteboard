/**
 * normalizeTtsText
 *
 * Cleans up text before it is sent to ElevenLabs so that the spoken output
 * sounds natural.  All transformations are idempotent and order-dependent —
 * do not reorder the steps without testing.
 *
 * Handles:
 *  - Markdown (bold, italic, headers, bullets, code fences, inline code, links)
 *  - URLs (replaces raw https?:// links with a short spoken form)
 *  - Emoji (strips them — ElevenLabs reads emoji names aloud, which sounds odd)
 *  - Common abbreviations / symbols (%, $, °, &, →, …)
 *  - Ordinal numbers (1st → first, 2nd → second, etc.)
 *  - Excessive whitespace / newlines
 */

// ── Ordinal helpers ───────────────────────────────────────────────────────────

const ORDINALS: Record<number, string> = {
  1: 'first',       2: 'second',      3: 'third',       4: 'fourth',
  5: 'fifth',       6: 'sixth',       7: 'seventh',     8: 'eighth',
  9: 'ninth',       10: 'tenth',      11: 'eleventh',   12: 'twelfth',
  13: 'thirteenth', 14: 'fourteenth', 15: 'fifteenth',  16: 'sixteenth',
  17: 'seventeenth',18: 'eighteenth', 19: 'nineteenth', 20: 'twentieth',
  21: 'twenty-first',22: 'twenty-second',23: 'twenty-third',24: 'twenty-fourth',
  25: 'twenty-fifth',26: 'twenty-sixth',27: 'twenty-seventh',28: 'twenty-eighth',
  29: 'twenty-ninth',30: 'thirtieth', 31: 'thirty-first',
}

function spokenOrdinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`
}

// ── Main export ───────────────────────────────────────────────────────────────

export function normalizeTtsText(raw: string): string {
  let t = raw

  // 1. Strip markdown code fences (``` ... ```)
  t = t.replace(/```[\s\S]*?```/g, '')

  // 2. Strip inline code (`code`)
  t = t.replace(/`[^`]*`/g, '')

  // 3. Strip markdown images ![alt](url)
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '')

  // 4. Replace markdown links [text](url) → just the text
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // 5. Strip bare URLs (http/https)
  t = t.replace(/https?:\/\/\S+/g, 'a link')

  // 6. Strip markdown bold/italic (**text**, *text*, __text__, _text_)
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1')
  t = t.replace(/__([^_]+)__/g, '$1')
  t = t.replace(/\*([^*]+)\*/g, '$1')
  t = t.replace(/_([^_]+)_/g, '$1')

  // 7. Strip markdown headers (# Heading)
  t = t.replace(/^#{1,6}\s+/gm, '')

  // 8. Replace markdown bullet/list markers with a pause comma
  t = t.replace(/^[\s]*[-*+]\s+/gm, ', ')
  t = t.replace(/^[\s]*\d+\.\s+/gm, ', ')

  // 9. Replace horizontal rules
  t = t.replace(/^[-*_]{3,}\s*$/gm, '.')

  // 10. Emoji — strip all emoji characters (they get read as "grinning face" etc.)
  // Covers most Unicode emoji ranges
  t = t.replace(
    /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
    '',
  )

  // 11. Common symbols → spoken words
  t = t.replace(/&amp;/g, 'and')
  t = t.replace(/\s*&\s*/g, ' and ')
  t = t.replace(/→|=>|->|»/g, 'to')
  t = t.replace(/←|<=|<-|«/g, 'from')
  t = t.replace(/°C/g, ' degrees Celsius')
  t = t.replace(/°F/g, ' degrees Fahrenheit')
  t = t.replace(/°/g, ' degrees')
  t = t.replace(/\$/g, ' dollars ')
  t = t.replace(/€/g, ' euros ')
  t = t.replace(/£/g, ' pounds ')
  t = t.replace(/%/g, ' percent')
  t = t.replace(/\+/g, ' plus ')
  t = t.replace(/×/g, ' times ')
  t = t.replace(/÷/g, ' divided by ')
  t = t.replace(/≈/g, ' approximately ')
  t = t.replace(/≠/g, ' not equal to ')
  t = t.replace(/≤/g, ' less than or equal to ')
  t = t.replace(/≥/g, ' greater than or equal to ')
  t = t.replace(/\.\.\./g, ', ')   // ellipsis → brief pause
  t = t.replace(/…/g, ', ')        // unicode ellipsis

  // 12. Ordinal numbers: 1st, 2nd, 3rd … 31st
  t = t.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, (_, num) => spokenOrdinal(Number(num)))

  // 13. Strip remaining special characters that have no spoken value
  //     Keep: letters, digits, spaces, basic punctuation (.,!?;:'-) and parentheses
  t = t.replace(/[^\w\s.,!?;:'"()\-]/g, ' ')

  // 14. Collapse multiple spaces / newlines into a single space or sentence pause
  t = t.replace(/\n{2,}/g, '. ')   // paragraph break → sentence pause
  t = t.replace(/\n/g, ' ')
  t = t.replace(/\s{2,}/g, ' ')

  // 15. Trim
  t = t.trim()

  // 16. Ensure the text ends with terminal punctuation so ElevenLabs doesn't
  //     trail off mid-sentence.
  if (t && !/[.!?]$/.test(t)) t += '.'

  return t
}
