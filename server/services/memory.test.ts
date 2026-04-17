import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// We create a real in-memory DB and point the module at it by mocking db.js
let db: ReturnType<typeof Database>

vi.mock('./db.js', () => {
  // Use a factory so we can get a reference to the shared in-memory DB.
  // The actual DB is created lazily on first use.
  const Database = require('better-sqlite3')
  const instance = new Database(':memory:')
  instance.pragma('journal_mode = WAL')
  instance.pragma('foreign_keys = ON')
  instance.exec(`
    CREATE TABLE IF NOT EXISTS memory (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT    NOT NULL DEFAULT '',
      location    TEXT    NOT NULL DEFAULT '',
      preferences TEXT    NOT NULL DEFAULT '[]',
      facts       TEXT    NOT NULL DEFAULT '[]',
      databases   TEXT    NOT NULL DEFAULT '{}'
    );
  `)
  // Expose reference for test cleanup
  ;(globalThis as any).__memTestDb = instance
  return { default: instance }
})

import { loadMemory, saveMemory, memoryToPrompt, type WalliMemory } from './memory.js'

beforeEach(() => {
  const d = (globalThis as any).__memTestDb as ReturnType<typeof Database>
  d.prepare('DELETE FROM memory').run()
})

describe('loadMemory', () => {
  it('returns default empty memory when no row exists', () => {
    const mem = loadMemory()
    expect(mem.name).toBe('')
    expect(mem.location).toBe('')
    expect(mem.preferences).toEqual([])
    expect(mem.facts).toEqual([])
    expect(mem.databases).toEqual({})
  })

  it('returns stored values', () => {
    const d = (globalThis as any).__memTestDb as ReturnType<typeof Database>
    d.prepare(`INSERT INTO memory (id, name, location, preferences, facts, databases)
               VALUES (1, 'Alice', 'NYC', '["dark mode"]', '["has a dog"]', '{"Tasks":"db-1"}')`)
      .run()
    const mem = loadMemory()
    expect(mem.name).toBe('Alice')
    expect(mem.location).toBe('NYC')
    expect(mem.preferences).toEqual(['dark mode'])
    expect(mem.facts).toEqual(['has a dog'])
    expect(mem.databases).toEqual({ Tasks: 'db-1' })
  })

  it('is idempotent (repeated loads return same data)', () => {
    const m1 = loadMemory()
    const m2 = loadMemory()
    expect(m1).toEqual(m2)
  })
})

describe('saveMemory', () => {
  it('saves a complete memory object', () => {
    const mem: WalliMemory = {
      name: 'Bob',
      location: 'London',
      preferences: ['morning person'],
      facts: ['likes cats'],
      databases: { Notes: 'db-2' },
    }
    saveMemory(mem)
    const loaded = loadMemory()
    expect(loaded.name).toBe('Bob')
    expect(loaded.location).toBe('London')
    expect(loaded.preferences).toEqual(['morning person'])
    expect(loaded.facts).toEqual(['likes cats'])
    expect(loaded.databases).toEqual({ Notes: 'db-2' })
  })

  it('overwrites existing memory', () => {
    saveMemory({ name: 'First', location: 'A', preferences: [], facts: [], databases: {} })
    saveMemory({ name: 'Second', location: 'B', preferences: [], facts: [], databases: {} })
    const loaded = loadMemory()
    expect(loaded.name).toBe('Second')
    expect(loaded.location).toBe('B')
  })

  it('persists empty arrays and objects correctly', () => {
    saveMemory({ name: '', location: '', preferences: [], facts: [], databases: {} })
    const loaded = loadMemory()
    expect(loaded.preferences).toEqual([])
    expect(loaded.facts).toEqual([])
    expect(loaded.databases).toEqual({})
  })

  it('handles multiple preferences and facts', () => {
    saveMemory({
      name: 'Carol',
      location: 'Paris',
      preferences: ['night owl', 'tea drinker'],
      facts: ['has 2 cats', 'works remotely'],
      databases: { Tasks: 'db-t', Notes: 'db-n' },
    })
    const loaded = loadMemory()
    expect(loaded.preferences).toHaveLength(2)
    expect(loaded.facts).toHaveLength(2)
    expect(Object.keys(loaded.databases)).toHaveLength(2)
  })
})

describe('memoryToPrompt', () => {
  it('returns empty string for completely empty memory', () => {
    const result = memoryToPrompt({ name: '', location: '', preferences: [], facts: [], databases: {} })
    expect(result).toBe('')
  })

  it('includes user name when set', () => {
    const result = memoryToPrompt({ name: 'Alice', location: '', preferences: [], facts: [], databases: {} })
    expect(result).toContain("User's name: Alice")
  })

  it('includes location when set', () => {
    const result = memoryToPrompt({ name: '', location: 'New York', preferences: [], facts: [], databases: {} })
    expect(result).toContain("User's location: New York")
  })

  it('includes preferences when non-empty', () => {
    const result = memoryToPrompt({ name: '', location: '', preferences: ['dark mode', 'tea'], facts: [], databases: {} })
    expect(result).toContain('Preferences: dark mode, tea')
  })

  it('includes facts when non-empty', () => {
    const result = memoryToPrompt({ name: '', location: '', preferences: [], facts: ['has a dog', 'works remote'], databases: {} })
    expect(result).toContain('Known facts: has a dog, works remote')
  })

  it('includes databases when non-empty', () => {
    const result = memoryToPrompt({ name: '', location: '', preferences: [], facts: [], databases: { Tasks: 'db-1', Notes: 'db-2' } })
    expect(result).toContain('Known databases:')
    expect(result).toContain('Tasks (db-1)')
    expect(result).toContain('Notes (db-2)')
  })

  it('includes all fields together', () => {
    const result = memoryToPrompt({
      name: 'Alice',
      location: 'NYC',
      preferences: ['tea'],
      facts: ['has a cat'],
      databases: { Tasks: 'db-1' },
    })
    expect(result).toContain("What you know about the user:")
    expect(result).toContain("User's name: Alice")
    expect(result).toContain("User's location: NYC")
    expect(result).toContain('Preferences: tea')
    expect(result).toContain('Known facts: has a cat')
    expect(result).toContain('Tasks (db-1)')
  })

  it('does not include name line when name is empty', () => {
    const result = memoryToPrompt({ name: '', location: 'NYC', preferences: [], facts: [], databases: {} })
    expect(result).not.toContain("User's name")
  })

  it('does not include location line when location is empty', () => {
    const result = memoryToPrompt({ name: 'Alice', location: '', preferences: [], facts: [], databases: {} })
    expect(result).not.toContain("User's location")
  })
})
