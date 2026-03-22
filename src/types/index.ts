export interface LayoutSlot {
  id: string
  x: number      // fraction 0–1 of canvas width
  y: number      // fraction 0–1 of canvas height
  width: number  // fraction 0–1
  height: number // fraction 0–1
  label?: string
}

export interface Layout {
  id: string
  name: string
  slots: LayoutSlot[]
}

export interface WidgetLayout {
  id: string
  type?:     string                    // 'database' | 'calendar' | or any key from widgets/registry.tsx
  settings?: Record<string, unknown>   // widget-type-specific config, persisted
  databaseId?: string                        // notion database widgets
  calendarId?: string                        // google calendar widgets
  databaseTitle: string           // display title for both types
  x: number
  y: number
  width: number
  height: number
  slotId?: string                      // assigned layout slot id, if any
}

/** A widget config waiting to be placed (slot selection or free-floating fallback) */
export interface PendingWidget {
  type?: string
  databaseId?: string
  calendarId?: string
  databaseTitle: string
  width: number
  height: number
  settings?: Record<string, unknown>
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
