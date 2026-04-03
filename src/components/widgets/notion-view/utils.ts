import type { NotionPage } from './types'

/** Extract a plain value from any Notion property type */
export function getProp(page: NotionPage, propName: string): any {
  const prop = page.properties[propName]
  if (!prop) return null
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text        ?? null
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text    ?? null
    case 'number':       return prop.number                        ?? null
    case 'checkbox':     return prop.checkbox                      ?? false
    case 'date':         return prop.date?.start                   ?? null
    case 'select':       return prop.select?.name                  ?? null
    case 'status':       return prop.status?.name                  ?? null
    case 'multi_select': return (prop.multi_select ?? []).map((s: any) => s.name)
    case 'url':          return prop.url                           ?? null
    case 'email':        return prop.email                         ?? null
    case 'phone_number': return prop.phone_number                  ?? null
    case 'formula':      return prop.formula?.string ?? prop.formula?.number ?? null
    default:             return null
  }
}

export function formatDate(dateStr: string, style: 'short' | 'long' = 'short'): string {
  const d = new Date(dateStr)
  if (style === 'long') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatValue(v: any): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  if (Array.isArray(v)) return v.join(', ') || '—'
  return String(v)
}
