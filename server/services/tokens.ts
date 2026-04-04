import db from './db.js'

export function loadTokens(): Record<string, string> | null {
  const rows = db.prepare('SELECT key, value FROM kv').all() as { key: string; value: string }[]
  return rows.length ? Object.fromEntries(rows.map((r) => [r.key, r.value])) : null
}

export function saveTokens(tokens: Record<string, string>): void {
  const upsert = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)')
  db.transaction(() => {
    for (const [k, v] of Object.entries(tokens)) upsert.run(k, v)
  })()
}
