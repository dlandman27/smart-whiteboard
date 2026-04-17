import { describe, it, expect } from 'vitest'
import { getProp, formatDate, formatValue } from './utils'
import type { NotionPage } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePage(properties: Record<string, any>): NotionPage {
  return { id: 'test-page', properties }
}

// ── getProp ───────────────────────────────────────────────────────────────────

describe('getProp', () => {
  it('returns null for missing property', () => {
    const page = makePage({})
    expect(getProp(page, 'NonExistent')).toBeNull()
  })

  it('returns null for unknown property type', () => {
    const page = makePage({ Foo: { type: 'created_time', created_time: '2025-01-01' } })
    expect(getProp(page, 'Foo')).toBeNull()
  })

  describe('title type', () => {
    it('returns the plain_text of the first title segment', () => {
      const page = makePage({
        Name: { type: 'title', title: [{ plain_text: 'My Page' }] },
      })
      expect(getProp(page, 'Name')).toBe('My Page')
    })

    it('returns null when title array is empty', () => {
      const page = makePage({ Name: { type: 'title', title: [] } })
      expect(getProp(page, 'Name')).toBeNull()
    })

    it('returns null when title is undefined', () => {
      const page = makePage({ Name: { type: 'title' } })
      expect(getProp(page, 'Name')).toBeNull()
    })
  })

  describe('rich_text type', () => {
    it('returns the plain_text of the first segment', () => {
      const page = makePage({
        Notes: { type: 'rich_text', rich_text: [{ plain_text: 'Hello' }] },
      })
      expect(getProp(page, 'Notes')).toBe('Hello')
    })

    it('returns null when rich_text array is empty', () => {
      const page = makePage({ Notes: { type: 'rich_text', rich_text: [] } })
      expect(getProp(page, 'Notes')).toBeNull()
    })
  })

  describe('number type', () => {
    it('returns the number value', () => {
      const page = makePage({ Count: { type: 'number', number: 42 } })
      expect(getProp(page, 'Count')).toBe(42)
    })

    it('returns 0 for zero value', () => {
      const page = makePage({ Count: { type: 'number', number: 0 } })
      expect(getProp(page, 'Count')).toBe(0)
    })

    it('returns null when number is null', () => {
      const page = makePage({ Count: { type: 'number', number: null } })
      expect(getProp(page, 'Count')).toBeNull()
    })
  })

  describe('checkbox type', () => {
    it('returns true when checked', () => {
      const page = makePage({ Done: { type: 'checkbox', checkbox: true } })
      expect(getProp(page, 'Done')).toBe(true)
    })

    it('returns false when unchecked', () => {
      const page = makePage({ Done: { type: 'checkbox', checkbox: false } })
      expect(getProp(page, 'Done')).toBe(false)
    })

    it('returns false as default when checkbox is undefined', () => {
      const page = makePage({ Done: { type: 'checkbox' } })
      expect(getProp(page, 'Done')).toBe(false)
    })
  })

  describe('date type', () => {
    it('returns start date string', () => {
      const page = makePage({ Due: { type: 'date', date: { start: '2025-06-15' } } })
      expect(getProp(page, 'Due')).toBe('2025-06-15')
    })

    it('returns null when date is null', () => {
      const page = makePage({ Due: { type: 'date', date: null } })
      expect(getProp(page, 'Due')).toBeNull()
    })
  })

  describe('select type', () => {
    it('returns the select name', () => {
      const page = makePage({ Status: { type: 'select', select: { name: 'In Progress' } } })
      expect(getProp(page, 'Status')).toBe('In Progress')
    })

    it('returns null when select is null', () => {
      const page = makePage({ Status: { type: 'select', select: null } })
      expect(getProp(page, 'Status')).toBeNull()
    })
  })

  describe('status type', () => {
    it('returns the status name', () => {
      const page = makePage({ State: { type: 'status', status: { name: 'Done' } } })
      expect(getProp(page, 'State')).toBe('Done')
    })

    it('returns null when status is null', () => {
      const page = makePage({ State: { type: 'status', status: null } })
      expect(getProp(page, 'State')).toBeNull()
    })
  })

  describe('multi_select type', () => {
    it('returns array of names', () => {
      const page = makePage({
        Tags: {
          type: 'multi_select',
          multi_select: [{ name: 'Alpha' }, { name: 'Beta' }],
        },
      })
      expect(getProp(page, 'Tags')).toEqual(['Alpha', 'Beta'])
    })

    it('returns empty array when multi_select is empty', () => {
      const page = makePage({ Tags: { type: 'multi_select', multi_select: [] } })
      expect(getProp(page, 'Tags')).toEqual([])
    })

    it('returns empty array when multi_select is undefined', () => {
      const page = makePage({ Tags: { type: 'multi_select' } })
      expect(getProp(page, 'Tags')).toEqual([])
    })
  })

  describe('url type', () => {
    it('returns the url string', () => {
      const page = makePage({ Link: { type: 'url', url: 'https://example.com' } })
      expect(getProp(page, 'Link')).toBe('https://example.com')
    })

    it('returns null when url is null', () => {
      const page = makePage({ Link: { type: 'url', url: null } })
      expect(getProp(page, 'Link')).toBeNull()
    })
  })

  describe('email type', () => {
    it('returns the email string', () => {
      const page = makePage({ Email: { type: 'email', email: 'test@example.com' } })
      expect(getProp(page, 'Email')).toBe('test@example.com')
    })

    it('returns null when email is null', () => {
      const page = makePage({ Email: { type: 'email', email: null } })
      expect(getProp(page, 'Email')).toBeNull()
    })
  })

  describe('phone_number type', () => {
    it('returns the phone number string', () => {
      const page = makePage({ Phone: { type: 'phone_number', phone_number: '+1-555-0100' } })
      expect(getProp(page, 'Phone')).toBe('+1-555-0100')
    })

    it('returns null when phone_number is null', () => {
      const page = makePage({ Phone: { type: 'phone_number', phone_number: null } })
      expect(getProp(page, 'Phone')).toBeNull()
    })
  })

  describe('formula type', () => {
    it('returns string formula result', () => {
      const page = makePage({ Computed: { type: 'formula', formula: { string: 'hello', number: null } } })
      expect(getProp(page, 'Computed')).toBe('hello')
    })

    it('returns number formula result when string is not available', () => {
      const page = makePage({ Computed: { type: 'formula', formula: { number: 99 } } })
      expect(getProp(page, 'Computed')).toBe(99)
    })

    it('returns null when formula is null', () => {
      const page = makePage({ Computed: { type: 'formula', formula: null } })
      expect(getProp(page, 'Computed')).toBeNull()
    })
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  // Use noon UTC to avoid timezone-related day shifts in any environment
  it('returns short format by default', () => {
    const result = formatDate('2025-06-15T12:00:00')
    // Expect "Jun 15" style — locale dependent but should include month name and day
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
  })

  it('returns long format when style is "long"', () => {
    const result = formatDate('2025-06-15T12:00:00', 'long')
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })

  it('short format does not include year', () => {
    const result = formatDate('2025-06-15T12:00:00', 'short')
    expect(result).not.toMatch(/2025/)
  })

  it('long format includes year', () => {
    const result = formatDate('2025-06-15T12:00:00', 'long')
    expect(result).toMatch(/2025/)
  })

  it('returns a string', () => {
    expect(typeof formatDate('2025-01-01T12:00:00')).toBe('string')
  })
})

// ── formatValue ───────────────────────────────────────────────────────────────

describe('formatValue', () => {
  it('returns em dash for null', () => {
    expect(formatValue(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatValue(undefined)).toBe('—')
  })

  it('returns checkmark for true boolean', () => {
    expect(formatValue(true)).toBe('✓')
  })

  it('returns cross for false boolean', () => {
    expect(formatValue(false)).toBe('✗')
  })

  it('returns comma-joined string for non-empty array', () => {
    expect(formatValue(['Alpha', 'Beta', 'Gamma'])).toBe('Alpha, Beta, Gamma')
  })

  it('returns em dash for empty array', () => {
    expect(formatValue([])).toBe('—')
  })

  it('converts numbers to string', () => {
    expect(formatValue(42)).toBe('42')
    expect(formatValue(0)).toBe('0')
    expect(formatValue(-5.5)).toBe('-5.5')
  })

  it('returns string as-is', () => {
    expect(formatValue('hello')).toBe('hello')
    expect(formatValue('')).toBe('')
  })

  it('converts objects via String()', () => {
    expect(formatValue({ toString: () => 'custom' })).toBe('custom')
  })
})
