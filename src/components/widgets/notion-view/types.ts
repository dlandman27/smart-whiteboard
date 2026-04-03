export type TemplateType =
  | 'metric-chart'
  | 'data-table'
  | 'stat-cards'
  | 'habit-grid'
  | 'kanban'
  | 'timeline'
  | 'todo-list'

export interface NotionViewSettings {
  databaseId: string
  template:   TemplateType
  title?:     string
  /** Template-specific field mappings — see each template for expected keys */
  fieldMap:   Record<string, any>
  /** Template-specific display options */
  options?:   Record<string, any>
}

export interface NotionPage {
  id:         string
  properties: Record<string, any>
}

export interface TemplateProps {
  pages:    NotionPage[]
  fieldMap: Record<string, any>
  options:  Record<string, any>
}
