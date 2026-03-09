export interface WidgetLayout {
  id: string
  databaseId: string
  databaseTitle: string
  x: number
  y: number
  width: number
  height: number
}

// Simplified Notion property value shapes
export type NotionPropValue =
  | { type: 'title'; title: Array<{ plain_text: string }> }
  | { type: 'rich_text'; rich_text: Array<{ plain_text: string }> }
  | { type: 'number'; number: number | null }
  | { type: 'select'; select: { name: string; color: string } | null }
  | { type: 'multi_select'; multi_select: Array<{ id: string; name: string; color: string }> }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'date'; date: { start: string; end: string | null } | null }
  | { type: 'status'; status: { name: string; color: string } | null }
  | { type: 'email'; email: string | null }
  | { type: 'phone_number'; phone_number: string | null }
  | { type: 'url'; url: string | null }
  | { type: string; [key: string]: unknown }

export interface NotionPage {
  id: string
  properties: Record<string, NotionPropValue>
  archived: boolean
  url: string
}

export interface NotionDatabase {
  id: string
  title: Array<{ plain_text: string }>
  properties: Record<string, { type: string; name: string }>
}
