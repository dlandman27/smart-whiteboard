import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// Mock db.js with a fresh in-memory SQLite instance
vi.mock('./db.js', () => {
  const Database = require('better-sqlite3')
  const instance = new Database(':memory:')
  instance.pragma('journal_mode = WAL')
  instance.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  ;(globalThis as any).__tokTestDb = instance
  return { default: instance }
})

import { loadTokens, saveTokens, deleteTokens } from './tokens.js'

beforeEach(() => {
  const d = (globalThis as any).__tokTestDb as ReturnType<typeof Database>
  d.prepare('DELETE FROM kv').run()
})

describe('loadTokens', () => {
  it('returns null when no tokens stored', () => {
    expect(loadTokens()).toBeNull()
  })

  it('returns a record when tokens exist', () => {
    const d = (globalThis as any).__tokTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('access_token', 'abc123')
    d.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('refresh_token', 'xyz789')
    const tokens = loadTokens()
    expect(tokens).not.toBeNull()
    expect(tokens!.access_token).toBe('abc123')
    expect(tokens!.refresh_token).toBe('xyz789')
  })

  it('returns all stored key-value pairs', () => {
    const d = (globalThis as any).__tokTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k1', 'v1')
    d.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k2', 'v2')
    d.prepare('INSERT INTO kv (key, value) VALUES (?, ?)').run('k3', 'v3')
    const tokens = loadTokens()
    expect(Object.keys(tokens!)).toHaveLength(3)
  })
})

describe('saveTokens', () => {
  it('saves a single token', () => {
    saveTokens({ access_token: 'tok-123' })
    const tokens = loadTokens()
    expect(tokens).not.toBeNull()
    expect(tokens!.access_token).toBe('tok-123')
  })

  it('saves multiple tokens', () => {
    saveTokens({ access_token: 'at', refresh_token: 'rt', expires_at: '2025-12-31' })
    const tokens = loadTokens()
    expect(tokens!.access_token).toBe('at')
    expect(tokens!.refresh_token).toBe('rt')
    expect(tokens!.expires_at).toBe('2025-12-31')
  })

  it('upserts (replaces) existing tokens', () => {
    saveTokens({ access_token: 'old' })
    saveTokens({ access_token: 'new' })
    const tokens = loadTokens()
    expect(tokens!.access_token).toBe('new')
  })

  it('does not delete keys not included in the new save (upsert semantics)', () => {
    saveTokens({ access_token: 'at', refresh_token: 'rt' })
    saveTokens({ access_token: 'at-new' })
    const tokens = loadTokens()
    // refresh_token still exists because saveTokens only upserts, doesn't delete
    expect(tokens!.refresh_token).toBe('rt')
    expect(tokens!.access_token).toBe('at-new')
  })

  it('saves within a transaction (atomic)', () => {
    // If saving multiple tokens, they should all appear or none
    saveTokens({ k1: 'v1', k2: 'v2', k3: 'v3' })
    const tokens = loadTokens()
    expect(Object.keys(tokens!)).toHaveLength(3)
  })
})

describe('deleteTokens', () => {
  it('deletes a single specified key', () => {
    saveTokens({ access_token: 'at', refresh_token: 'rt' })
    deleteTokens(['access_token'])
    const tokens = loadTokens()
    expect(tokens).not.toBeNull()
    expect(tokens!.access_token).toBeUndefined()
    expect(tokens!.refresh_token).toBe('rt')
  })

  it('deletes multiple keys', () => {
    saveTokens({ access_token: 'at', refresh_token: 'rt', extra: 'e' })
    deleteTokens(['access_token', 'refresh_token'])
    const tokens = loadTokens()
    expect(tokens!.extra).toBe('e')
    expect(tokens!.access_token).toBeUndefined()
    expect(tokens!.refresh_token).toBeUndefined()
  })

  it('deletes all keys resulting in null from loadTokens', () => {
    saveTokens({ k1: 'v1', k2: 'v2' })
    deleteTokens(['k1', 'k2'])
    expect(loadTokens()).toBeNull()
  })

  it('does nothing when deleting a non-existent key', () => {
    saveTokens({ k1: 'v1' })
    deleteTokens(['non_existent'])
    const tokens = loadTokens()
    expect(tokens!.k1).toBe('v1')
  })

  it('handles empty array gracefully', () => {
    saveTokens({ k1: 'v1' })
    deleteTokens([])
    const tokens = loadTokens()
    expect(tokens!.k1).toBe('v1')
  })
})
