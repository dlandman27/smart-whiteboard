import type { UnifiedTask, UnifiedEvent, SourceGroup } from '../types/unified'

export interface TaskProvider {
  id: string
  label: string
  icon: string
  isConnected: () => boolean
  fetchGroups: () => Promise<SourceGroup[]>
  fetchTasks: (groupIds?: string[]) => Promise<UnifiedTask[]>
  createTask?: (groupId: string, task: { title: string; notes?: string; due?: string; priority?: number }) => Promise<void>
  toggleTask?: (task: UnifiedTask) => Promise<void>
  deleteTask?: (task: UnifiedTask) => Promise<void>
}

export interface EventProvider {
  id: string
  label: string
  icon: string
  isConnected: () => boolean
  fetchGroups: () => Promise<SourceGroup[]>
  fetchEvents: (timeMin: string, timeMax: string, groupIds?: string[]) => Promise<UnifiedEvent[]>
  createEvent?: (groupId: string, event: { title: string; start: string; end?: string; allDay?: boolean }) => Promise<void>
  deleteEvent?: (event: UnifiedEvent) => Promise<void>
}
