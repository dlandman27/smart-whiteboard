import db from './db.js'

export function getAgentState(agentId: string, key: string): string | null {
  const row = db.prepare('SELECT value FROM agent_state WHERE agent_id = ? AND key = ?').get(agentId, key) as { value: string } | undefined
  return row?.value ?? null
}

export function setAgentState(agentId: string, key: string, value: string): void {
  db.prepare(`INSERT OR REPLACE INTO agent_state (agent_id, key, value, updated_at)
              VALUES (?, ?, ?, ?)`)
    .run(agentId, key, value, new Date().toISOString())
}

export function getAllAgentState(agentId: string): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM agent_state WHERE agent_id = ?').all(agentId) as Array<{ key: string; value: string }>
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function clearAgentState(agentId: string): void {
  db.prepare('DELETE FROM agent_state WHERE agent_id = ?').run(agentId)
}
