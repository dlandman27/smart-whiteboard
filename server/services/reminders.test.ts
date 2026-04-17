import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// Create a fresh in-memory DB and mock the db module
vi.mock('./db.js', () => {
  const Database = require('better-sqlite3')
  const instance = new Database(':memory:')
  instance.pragma('journal_mode = WAL')
  instance.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id      TEXT    PRIMARY KEY,
      text    TEXT    NOT NULL,
      fire_at TEXT    NOT NULL,
      fired   INTEGER NOT NULL DEFAULT 0
    );
  `)
  ;(globalThis as any).__remTestDb = instance
  return { default: instance }
})

import { loadReminders, saveReminders, type Reminder } from './reminders.js'

beforeEach(() => {
  const d = (globalThis as any).__remTestDb as ReturnType<typeof Database>
  d.prepare('DELETE FROM reminders').run()
})

describe('loadReminders', () => {
  it('returns empty array when no reminders exist', () => {
    expect(loadReminders()).toEqual([])
  })

  it('returns all stored reminders', () => {
    const d = (globalThis as any).__remTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Buy milk', '2025-01-01T10:00:00Z', 0)
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r2', 'Call doctor', '2025-01-02T10:00:00Z', 1)

    const reminders = loadReminders()
    expect(reminders).toHaveLength(2)
  })

  it('maps fired column integer to boolean', () => {
    const d = (globalThis as any).__remTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Test', '2025-01-01T10:00:00Z', 0)
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r2', 'Done', '2025-01-01T11:00:00Z', 1)

    const reminders = loadReminders()
    const unfired = reminders.find((r) => r.id === 'r1')!
    const fired   = reminders.find((r) => r.id === 'r2')!
    expect(unfired.fired).toBe(false)
    expect(fired.fired).toBe(true)
  })

  it('maps fire_at column to fireAt property', () => {
    const d = (globalThis as any).__remTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('r1', 'Test', '2025-06-15T09:30:00Z', 0)

    const [r] = loadReminders()
    expect(r.fireAt).toBe('2025-06-15T09:30:00Z')
  })

  it('returns correct id and text fields', () => {
    const d = (globalThis as any).__remTestDb as ReturnType<typeof Database>
    d.prepare('INSERT INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      .run('my-id', 'My reminder text', '2025-01-01T00:00:00Z', 0)

    const [r] = loadReminders()
    expect(r.id).toBe('my-id')
    expect(r.text).toBe('My reminder text')
  })
})

describe('saveReminders', () => {
  it('saves a list of reminders', () => {
    const reminders: Reminder[] = [
      { id: 'r1', text: 'Buy milk', fireAt: '2025-01-01T10:00:00Z', fired: false },
      { id: 'r2', text: 'Call doctor', fireAt: '2025-01-02T10:00:00Z', fired: true },
    ]
    saveReminders(reminders)
    const loaded = loadReminders()
    expect(loaded).toHaveLength(2)
  })

  it('round-trips reminder data accurately', () => {
    const original: Reminder[] = [
      { id: 'r1', text: 'Dentist appointment', fireAt: '2025-03-15T14:00:00Z', fired: false },
    ]
    saveReminders(original)
    const [loaded] = loadReminders()
    expect(loaded.id).toBe('r1')
    expect(loaded.text).toBe('Dentist appointment')
    expect(loaded.fireAt).toBe('2025-03-15T14:00:00Z')
    expect(loaded.fired).toBe(false)
  })

  it('persists fired=true as 1', () => {
    saveReminders([{ id: 'r1', text: 'Done', fireAt: '2025-01-01T00:00:00Z', fired: true }])
    const [loaded] = loadReminders()
    expect(loaded.fired).toBe(true)
  })

  it('replaces all existing reminders (delete + insert)', () => {
    saveReminders([
      { id: 'r1', text: 'Old 1', fireAt: '2025-01-01T00:00:00Z', fired: false },
      { id: 'r2', text: 'Old 2', fireAt: '2025-01-02T00:00:00Z', fired: false },
    ])
    saveReminders([
      { id: 'r3', text: 'New 1', fireAt: '2025-02-01T00:00:00Z', fired: false },
    ])
    const loaded = loadReminders()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('r3')
  })

  it('saves empty array (clears all reminders)', () => {
    saveReminders([{ id: 'r1', text: 'Something', fireAt: '2025-01-01T00:00:00Z', fired: false }])
    saveReminders([])
    expect(loadReminders()).toEqual([])
  })

  it('handles multiple reminders with different fired states', () => {
    const reminders: Reminder[] = [
      { id: 'r1', text: 'Unfired', fireAt: '2025-01-01T00:00:00Z', fired: false },
      { id: 'r2', text: 'Fired', fireAt: '2025-01-02T00:00:00Z', fired: true },
      { id: 'r3', text: 'Also unfired', fireAt: '2025-01-03T00:00:00Z', fired: false },
    ]
    saveReminders(reminders)
    const loaded = loadReminders()
    expect(loaded).toHaveLength(3)
    const firedCount = loaded.filter((r) => r.fired).length
    expect(firedCount).toBe(1)
  })
})
