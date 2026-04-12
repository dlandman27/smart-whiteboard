import { apiFetch } from '../../lib/apiFetch'
import type { TaskProvider } from '../types'
import type { UnifiedTask, SourceGroup } from '../../types/unified'

interface TaskList {
  id: string
  title: string
  updated: string
}

interface GTask {
  id: string
  title: string
  notes?: string
  status: 'needsAction' | 'completed'
  due?: string
  completed?: string
  parent?: string
  position?: string
  updated: string
  _taskListId?: string
}

export class GTasksProvider implements TaskProvider {
  id = 'gtasks'
  label = 'Google Tasks'
  icon = 'GoogleLogo'

  private _connected = false
  private _checkedStatus = false

  isConnected(): boolean {
    if (!this._checkedStatus) {
      // Kick off status check in background, return false until resolved
      this._checkStatus()
    }
    return this._connected
  }

  private async _checkStatus(): Promise<void> {
    try {
      const status = await apiFetch<{ connected: boolean }>('/api/gtasks/status')
      this._connected = status.connected
    } catch {
      this._connected = false
    }
    this._checkedStatus = true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const data = await apiFetch<{ items: TaskList[] }>('/api/gtasks/lists')
    return (data.items ?? []).map((list) => ({
      provider: 'gtasks',
      groupName: list.title,
    }))
  }

  async fetchTasks(groupIds?: string[]): Promise<UnifiedTask[]> {
    const lists = await apiFetch<{ items: TaskList[] }>('/api/gtasks/lists')
    const allLists = lists.items ?? []

    const targetLists = groupIds?.length
      ? allLists.filter((l) => groupIds.includes(l.id))
      : allLists

    const listMap = new Map(allLists.map((l) => [l.id, l]))

    const results = await Promise.all(
      targetLists.map((list) =>
        apiFetch<{ items: GTask[] }>(
          `/api/gtasks/tasks?taskListId=${encodeURIComponent(list.id)}&showCompleted=false`
        ).then((data) =>
          (data.items ?? []).map((task): UnifiedTask => {
            const taskList = listMap.get(list.id)
            return {
              source: { provider: 'gtasks', id: task.id, taskListId: list.id },
              title: task.title,
              notes: task.notes,
              completed: task.status === 'completed',
              priority: 4,
              due: task.due,
              groupName: taskList?.title ?? 'Tasks',
            }
          })
        )
      )
    )

    return results.flat()
  }

  async createTask(groupId: string, task: { title: string; notes?: string; due?: string }): Promise<void> {
    await apiFetch('/api/gtasks/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskListId: groupId, title: task.title, notes: task.notes, due: task.due }),
    })
  }

  async toggleTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'gtasks') return
    const { id, taskListId } = task.source
    const newStatus = task.completed ? 'needsAction' : 'completed'
    const body: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'needsAction') body.completed = null
    await apiFetch(`/api/gtasks/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async deleteTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'gtasks') return
    const { id, taskListId } = task.source
    await apiFetch(`/api/gtasks/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }
}
