/**
 * db.test.ts
 *
 * Tests for the SQLite schema and operations.
 * We use an in-memory database to avoid touching the real file.
 * The db module itself is NOT imported to avoid opening walli.db.
 * Instead we replicate the schema and test the SQL patterns directly.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// Shared schema applied to every in-memory db
function createDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT    NOT NULL DEFAULT '',
      location    TEXT    NOT NULL DEFAULT '',
      preferences TEXT    NOT NULL DEFAULT '[]',
      facts       TEXT    NOT NULL DEFAULT '[]',
      databases   TEXT    NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id      TEXT    PRIMARY KEY,
      text    TEXT    NOT NULL,
      fire_at TEXT    NOT NULL,
      fired   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_agents (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL,
      interval_ms INTEGER NOT NULL DEFAULT 3600000,
      enabled     INTEGER NOT NULL DEFAULT 1,
      icon        TEXT    NOT NULL DEFAULT '🤖',
      sprite_type TEXT,
      created_at  TEXT    NOT NULL
    );
  `)
  return db
}

describe('kv table', () => {
  let db: ReturnType<typeof createDb>

  beforeEach(() => { db = createDb() })

  it('inserts and retrieves a key-value pair', () => {
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('token', 'abc123')
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get('token') as any
    expect(row.value).toBe('abc123')
  })

  it('replaces an existing key on conflict', () => {
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('token', 'old')
    db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run('token', 'new')
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get('token') as any
    expect(row.value).toBe('new')
  })

  it('deletes a key', () => {
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('token', 'abc')
    db.prepare('DELETE FROM kv WHERE key = ?').run('token')
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get('token')
    expect(row).toBeUndefined()
  })

  it('returns empty rows when no kv entries', () => {
    const rows = db.prepare('SELECT key, value FROM kv').all()
    expect(rows).toHaveLength(0)
  })

  it('stores multiple keys', () => {
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k1', 'v1')
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k2', 'v2')
    const rows = db.prepare('SELECT key, value FROM kv').all() as any[]
    expect(rows).toHaveLength(2)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    expect(map.k1).toBe('v1')
    expect(map.k2).toBe('v2')
  })

  it('upserts multiple keys in a transaction', () => {
    const upsert = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)')
    db.transaction(() => {
      upsert.run('a', '1')
      upsert.run('b', '2')
    })()
    const rows = db.prepare('SELECT key, value FROM kv').all() as any[]
    expect(rows).toHaveLength(2)
  })
})

describe('memory table', () => {
  let db: ReturnType<typeof createDb>

  beforeEach(() => { db = createDb() })

  it('inserts the singleton memory row', () => {
    db.prepare(`INSERT OR IGNORE INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, '', '', '[]', '[]', '{}')`)
      .run()
    const row = db.prepare('SELECT * FROM memory WHERE id = 1').get() as any
    expect(row).toBeDefined()
    expect(row.id).toBe(1)
  })

  it('allows only one row (id must be 1)', () => {
    expect(() => {
      db.prepare(`INSERT INTO memory (id, name, location, preferences, facts, databases)
                  VALUES (2, '', '', '[]', '[]', '{}')`)
        .run()
    }).toThrow()
  })

  it('stores and retrieves name and location', () => {
    db.prepare(`INSERT OR REPLACE INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, ?, ?, '[]', '[]', '{}')`)
      .run('Alice', 'New York')
    const row = db.prepare('SELECT * FROM memory WHERE id = 1').get() as any
    expect(row.name).toBe('Alice')
    expect(row.location).toBe('New York')
  })

  it('stores JSON-encoded preferences and facts', () => {
    const prefs = JSON.stringify(['pref1', 'pref2'])
    const facts = JSON.stringify(['fact1'])
    db.prepare(`INSERT OR REPLACE INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, 'Bob', 'London', ?, ?, '{}')`)
      .run(prefs, facts)
    const row = db.prepare('SELECT preferences, facts FROM memory WHERE id = 1').get() as any
    expect(JSON.parse(row.preferences)).toEqual(['pref1', 'pref2'])
    expect(JSON.parse(row.facts)).toEqual(['fact1'])
  })

  it('stores JSON-encoded databases map', () => {
    const databases = JSON.stringify({ Tasks: 'db-abc', Notes: 'db-xyz' })
    db.prepare(`INSERT OR REPLACE INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, '', '', '[]', '[]', ?)`)
      .run(databases)
    const row = db.prepare('SELECT databases FROM memory WHERE id = 1').get() as any
    expect(JSON.parse(row.databases)).toEqual({ Tasks: 'db-abc', Notes: 'db-xyz' })
  })

  it('OR IGNORE does not overwrite existing row', () => {
    db.prepare(`INSERT INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, 'Alice', '', '[]', '[]', '{}')`)
      .run()
    db.prepare(`INSERT OR IGNORE INTO memory (id, name, location, preferences, facts, databases)
                VALUES (1, 'Bob', '', '[]', '[]', '{}')`)
      .run()
    const row = db.prepare('SELECT name FROM memory WHERE id = 1').get() as any
    expect(row.name).toBe('Alice')
  })
})

describe('reminders table', () => {
  let db: ReturnType<typeof createDb>

  beforeEach(() => { db = createDb() })

  it('inserts a reminder', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get('r1') as any
    expect(row.text).toBe('Buy milk')
    expect(row.fire_at).toBe('2025-01-01T10:00:00Z')
    expect(row.fired).toBe(0)
  })

  it('retrieves all reminders', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r2', 'Call doctor', '2025-01-02T10:00:00Z', 0)
    const rows = db.prepare('SELECT id, text, fire_at, fired FROM reminders').all()
    expect(rows).toHaveLength(2)
  })

  it('marks a reminder as fired', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    db.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run('r1')
    const row = db.prepare('SELECT fired FROM reminders WHERE id = ?').get('r1') as any
    expect(row.fired).toBe(1)
  })

  it('deletes all reminders', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    db.prepare('DELETE FROM reminders').run()
    const rows = db.prepare('SELECT * FROM reminders').all()
    expect(rows).toHaveLength(0)
  })

  it('OR IGNORE skips duplicate id', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    db.prepare('INSERT OR IGNORE INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Different text', '2025-02-01T10:00:00Z', 0)
    const row = db.prepare('SELECT text FROM reminders WHERE id = ?').get('r1') as any
    expect(row.text).toBe('Buy milk')
  })

  it('replaces reminders in a transaction (delete + insert)', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Old', '2025-01-01T10:00:00Z', 0)
    const insert = db.prepare('INSERT OR REPLACE INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
    db.transaction(() => {
      db.prepare('DELETE FROM reminders').run()
      insert.run('r2', 'New', '2025-02-01T10:00:00Z', 0)
    })()
    const rows = db.prepare('SELECT * FROM reminders').all()
    expect(rows).toHaveLength(1)
    const row = rows[0] as any
    expect(row.id).toBe('r2')
  })
})

describe('user_agents table', () => {
  let db: ReturnType<typeof createDb>

  beforeEach(() => { db = createDb() })

  it('inserts a user agent', () => {
    db.prepare(`INSERT INTO user_agents (id, name, description, interval_ms, enabled, icon, sprite_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('a1', 'News Agent', 'Fetches news', 3600000, 1, '📰', null, '2025-01-01T00:00:00Z')
    const row = db.prepare('SELECT * FROM user_agents WHERE id = ?').get('a1') as any
    expect(row.name).toBe('News Agent')
    expect(row.enabled).toBe(1)
    expect(row.icon).toBe('📰')
  })

  it('defaults icon to robot emoji when not specified', () => {
    // The default is in the column definition
    db.exec(`INSERT INTO user_agents (id, name, description, created_at) VALUES ('a2', 'Agent', 'Desc', '2025-01-01')`)
    const row = db.prepare('SELECT icon FROM user_agents WHERE id = ?').get('a2') as any
    expect(row.icon).toBe('🤖')
  })

  it('retrieves all agents', () => {
    db.prepare(`INSERT INTO user_agents (id, name, description, interval_ms, enabled, icon, sprite_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('a1', 'Agent 1', 'Desc 1', 3600000, 1, '🤖', null, '2025-01-01T00:00:00Z')
    db.prepare(`INSERT INTO user_agents (id, name, description, interval_ms, enabled, icon, sprite_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('a2', 'Agent 2', 'Desc 2', 7200000, 0, '🤖', null, '2025-01-02T00:00:00Z')
    const rows = db.prepare('SELECT * FROM user_agents').all()
    expect(rows).toHaveLength(2)
  })
})

describe('schema integrity', () => {
  let db: ReturnType<typeof createDb>

  beforeEach(() => { db = createDb() })

  it('all expected tables exist', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('kv')
    expect(names).toContain('memory')
    expect(names).toContain('reminders')
    expect(names).toContain('user_agents')
  })

  it('kv primary key enforces uniqueness', () => {
    db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k', 'v1')
    expect(() => {
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k', 'v2')
    }).toThrow()
  })

  it('reminders primary key enforces uniqueness', () => {
    db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'text', '2025-01-01T00:00:00Z', 0)
    expect(() => {
      db.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
        .run('r1', 'other', '2025-01-01T00:00:00Z', 0)
    }).toThrow()
  })
})
