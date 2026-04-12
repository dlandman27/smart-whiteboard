export type TaskSource =
  | { provider: 'builtin'; id: string }
  | { provider: 'gtasks'; id: string; taskListId: string }
  | { provider: 'todoist'; id: string; projectId: string }

export type EventSource =
  | { provider: 'builtin'; id: string }
  | { provider: 'gcal'; id: string; calendarId: string }
  | { provider: 'ical'; id: string; feedUrl: string }

export interface UnifiedTask {
  source: TaskSource
  title: string
  notes?: string
  completed: boolean
  priority: 1 | 2 | 3 | 4
  due?: string
  groupName: string
  groupColor?: string
  readOnly?: boolean
}

export interface UnifiedEvent {
  source: EventSource
  title: string
  description?: string
  location?: string
  start: string
  end?: string
  allDay: boolean
  color?: string
  groupName: string
  groupColor?: string
  readOnly?: boolean
}

export interface SourceGroup {
  provider: string
  groupName: string
  color?: string
  taskCount?: number
}
