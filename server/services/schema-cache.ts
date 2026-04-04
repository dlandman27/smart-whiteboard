import type { Client } from '@notionhq/client'

const schemaCache = new Map<string, { props: any[]; ts: number }>()
const SCHEMA_TTL  = 5 * 60 * 1000 // 5 min

export async function getCachedSchema(notion: Client, databaseId: string) {
  const hit = schemaCache.get(databaseId)
  if (hit && Date.now() - hit.ts < SCHEMA_TTL) return hit.props
  const db    = await notion.databases.retrieve({ database_id: databaseId })
  const props = Object.entries(db.properties as any).map(([name, p]: [string, any]) => ({
    name, type: p.type,
    ...(p.select       ? { options: p.select.options.map((o: any) => o.name) }       : {}),
    ...(p.multi_select ? { options: p.multi_select.options.map((o: any) => o.name) } : {}),
    ...(p.status       ? { options: p.status.options.map((o: any) => o.name) }       : {}),
  }))
  schemaCache.set(databaseId, { props, ts: Date.now() })
  return props
}

export function invalidateSchema(databaseId: string) {
  schemaCache.delete(databaseId)
}
