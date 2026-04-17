import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { log } from '../lib/logger.js'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'server/walli.db')

const db = new Database(DB_PATH)
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
    triggers    TEXT    NOT NULL DEFAULT '[]',
    created_at  TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_state (
    agent_id   TEXT NOT NULL,
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (agent_id, key)
  );
`)

// Add triggers column to existing installs that predate it
try { db.exec(`ALTER TABLE user_agents ADD COLUMN triggers TEXT NOT NULL DEFAULT '[]'`) } catch { /* already exists */ }

migrateFromJson()

export default db

// ── One-time migration from legacy JSON files ──────────────────────────────────

function migrateFromJson() {
  // memory.json
  const memPath = path.join(process.cwd(), 'server/memory.json')
  const hasMem  = db.prepare('SELECT id FROM memory WHERE id = 1').get()
  if (!hasMem && fs.existsSync(memPath)) {
    try {
      const d = JSON.parse(fs.readFileSync(memPath, 'utf-8'))
      db.prepare(`INSERT INTO memory (id, name, location, preferences, facts, databases)
                  VALUES (1, ?, ?, ?, ?, ?)`)
        .run(d.name ?? '', d.location ?? '',
             JSON.stringify(d.preferences ?? []),
             JSON.stringify(d.facts ?? []),
             JSON.stringify(d.databases ?? {}))
      log('[db] migrated memory.json → walli.db')
    } catch { /* start fresh */ }
  }

  // tokens.json
  const tokenPath = path.join(process.cwd(), 'tokens.json')
  const hasTokens = db.prepare('SELECT key FROM kv LIMIT 1').get()
  if (!hasTokens && fs.existsSync(tokenPath)) {
    try {
      const data    = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
      const upsert  = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)')
      db.transaction(() => {
        for (const [k, v] of Object.entries(data)) upsert.run(k, String(v))
      })()
      log('[db] migrated tokens.json → walli.db')
    } catch { /* ignore */ }
  }

  // reminders.json
  const remPath = path.join(process.cwd(), 'server/reminders.json')
  const hasRem  = db.prepare('SELECT id FROM reminders LIMIT 1').get()
  if (!hasRem && fs.existsSync(remPath)) {
    try {
      const data   = JSON.parse(fs.readFileSync(remPath, 'utf-8'))
      const insert = db.prepare('INSERT OR IGNORE INTO reminders (id, text, fire_at, fired) VALUES (?, ?, ?, ?)')
      db.transaction(() => {
        for (const r of data) insert.run(r.id, r.text, r.fireAt, r.fired ? 1 : 0)
      })()
      log('[db] migrated reminders.json → walli.db')
    } catch { /* ignore */ }
  }

  // user-agents.json
  const agentPath = path.join(process.cwd(), 'server/agents/user-agents.json')
  const hasAgents = db.prepare('SELECT id FROM user_agents LIMIT 1').get()
  if (!hasAgents && fs.existsSync(agentPath)) {
    try {
      const data   = JSON.parse(fs.readFileSync(agentPath, 'utf-8'))
      const insert = db.prepare(`INSERT OR IGNORE INTO user_agents
        (id, name, description, interval_ms, enabled, icon, sprite_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      db.transaction(() => {
        for (const a of data)
          insert.run(a.id, a.name, a.description, a.intervalMs, a.enabled ? 1 : 0,
                     a.icon ?? '🤖', a.spriteType ?? null, a.createdAt)
      })()
      log('[db] migrated user-agents.json → walli.db')
    } catch { /* ignore */ }
  }
}
