import { apiFetch } from '../../lib/apiFetch'
import type { TaskProvider } from '../types'
import type { UnifiedTask, SourceGroup } from '../../types/unified'

interface BuiltinTaskList {
  id: string
  name: string
  color?: string
}

interface BuiltinTask {
  id: string
  title: string
  notes?: string
  completed: boolean
  priority: number
  due?: string
  list_id: string
}

export class BuiltinTaskProvider implements TaskProvider {
  id = 'builtin'
  label = 'Built-in Tasks'
  icon = 'CheckSquare'

  isConnected(): boolean {
    return true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const lists = await apiFetch<BuiltinTaskList[]>('/api/tasks/lists')
    return lists.map((list) => ({
      provider: 'builtin',
      groupName: list.name,
      color: list.color,
    }))
  }

  async fetchTasks(groupIds?: string[]): Promise<UnifiedTask[]> {
    const params = new URLSearchParams()
    if (groupIds?.length) {
      params.set('listIds', groupIds.join(','))
    }
    const qs = params.toString()
    const tasks = await apiFetch<BuiltinTask[]>(`/api/tasks${qs ? `?${qs}` : ''}`)

    // Fetch lists for group name mapping
    const lists = await apiFetch<BuiltinTaskList[]>('/api/tasks/lists')
    const listMap = new Map(lists.map((l) => [l.id, l]))

    return tasks.map((task) => {
      const list = listMap.get(task.list_id)
      return {
        source: { provider: 'builtin' as const, id: task.id },
        title: task.title,
        notes: task.notes,
        completed: task.completed,
        priority: (task.priority >= 1 && task.priority <= 4 ? task.priority : 4) as 1 | 2 | 3 | 4,
        due: task.due,
        groupName: list?.name ?? 'Tasks',
        groupColor: list?.color,
      }
    })
  }

  async createTask(groupId: string, task: { title: string; notes?: string; due?: string; priority?: number }): Promise<void> {
    await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: groupId, ...task }),
    })
  }

  async toggleTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'builtin') return
    await apiFetch(`/api/tasks/${encodeURIComponent(task.source.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
  }

  async deleteTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'builtin') return
    await apiFetch(`/api/tasks/${encodeURIComponent(task.source.id)}`, {
      method: 'DELETE',
    })
  }
}
