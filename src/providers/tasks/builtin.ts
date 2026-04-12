import { apiFetch } from '../../lib/apiFetch'
import type { TaskProvider } from '../types'
import type { UnifiedTask, SourceGroup } from '../../types/unified'

export class BuiltinTaskProvider implements TaskProvider {
  id = 'builtin'
  label = 'Built-in Tasks'
  icon = 'CheckSquare'

  isConnected(): boolean {
    return true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const lists = await apiFetch<string[]>('/api/tasks/lists')
    return lists.map((name) => ({
      provider: 'builtin',
      groupName: name,
    }))
  }

  async fetchTasks(): Promise<UnifiedTask[]> {
    const tasks = await apiFetch<any[]>('/api/tasks')
    return tasks.map((task) => ({
      source: { provider: 'builtin' as const, id: task.id },
      title: task.title,
      notes: task.notes,
      completed: task.status === 'completed',
      priority: (task.priority >= 1 && task.priority <= 4 ? task.priority : 4) as 1 | 2 | 3 | 4,
      due: task.due,
      groupName: task.list_name ?? 'My Tasks',
    }))
  }

  async createTask(groupId: string, task: { title: string; notes?: string; due?: string; priority?: number }): Promise<void> {
    await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_name: groupId, ...task }),
    })
  }

  async toggleTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'builtin') return
    await apiFetch(`/api/tasks/${encodeURIComponent(task.source.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: task.completed ? 'needsAction' : 'completed' }),
    })
  }

  async deleteTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'builtin') return
    await apiFetch(`/api/tasks/${encodeURIComponent(task.source.id)}`, {
      method: 'DELETE',
    })
  }
}
