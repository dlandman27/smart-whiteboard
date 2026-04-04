import db from './db.js'

export interface WalliMemory {
  name:        string
  location:    string
  preferences: string[]
  facts:       string[]
  databases:   Record<string, string>
}

type MemoryRow = {
  id: number; name: string; location: string
  preferences: string; facts: string; databases: string
}

const ensureRow = db.prepare(
  `INSERT OR IGNORE INTO memory (id, name, location, preferences, facts, databases)
   VALUES (1, '', '', '[]', '[]', '{}')`
)

export function loadMemory(): WalliMemory {
  ensureRow.run()
  const row = db.prepare('SELECT * FROM memory WHERE id = 1').get() as MemoryRow
  return {
    name:        row.name,
    location:    row.location,
    preferences: JSON.parse(row.preferences),
    facts:       JSON.parse(row.facts),
    databases:   JSON.parse(row.databases),
  }
}

export function saveMemory(mem: WalliMemory): void {
  db.prepare(`INSERT OR REPLACE INTO memory (id, name, location, preferences, facts, databases)
              VALUES (1, ?, ?, ?, ?, ?)`)
    .run(mem.name, mem.location,
         JSON.stringify(mem.preferences),
         JSON.stringify(mem.facts),
         JSON.stringify(mem.databases))
}

export function memoryToPrompt(mem: WalliMemory): string {
  const lines: string[] = []
  if (mem.name)                lines.push(`User's name: ${mem.name}`)
  if (mem.location)            lines.push(`User's location: ${mem.location}`)
  if (mem.preferences.length)  lines.push(`Preferences: ${mem.preferences.join(', ')}`)
  if (mem.facts.length)        lines.push(`Known facts: ${mem.facts.join(', ')}`)
  const dbs = Object.entries(mem.databases)
  if (dbs.length)              lines.push(`Known databases: ${dbs.map(([k, v]) => `${k} (${v})`).join(', ')}`)
  return lines.length ? `\nWhat you know about the user:\n${lines.join('\n')}` : ''
}
