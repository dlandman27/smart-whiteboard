import { apiFetch } from '../../lib/apiFetch'
import type { TaskProvider } from '../types'
import type { UnifiedTask, SourceGroup } from '../../types/unified'

interface TodoistProject {
  id: string
  name: string
  color: string
}

interface TodoistTask {
  id: string
  content: string
  description: string
  is_completed: boolean
  priority: number
  due?: { date: string; string: string; datetime?: string }
  project_id: string
}

export class TodoistProvider implements TaskProvider {
  id = 'todoist'
  label = 'Todoist'
  icon = 'CheckCircle'

  private _connected = false
  private _checkedStatus = false

  isConnected(): boolean {
    if (!this._checkedStatus) {
      this._checkStatus()
    }
    return this._connected
  }

  private async _checkStatus(): Promise<void> {
    try {
      const status = await apiFetch<{ connected: boolean }>('/api/todoist/status')
      this._connected = status.connected
    } catch {
      this._connected = false
    }
    this._checkedStatus = true
  }

  async fetchGroups(): Promise<SourceGroup[]> {
    const projects = await apiFetch<TodoistProject[]>('/api/todoist/projects')
    return projects.map((project) => ({
      provider: 'todoist',
      groupName: project.name,
      color: project.color,
    }))
  }

  async fetchTasks(groupIds?: string[]): Promise<UnifiedTask[]> {
    // Fetch projects for name mapping
    const projects = await apiFetch<TodoistProject[]>('/api/todoist/projects')
    const projectMap = new Map(projects.map((p) => [p.id, p]))

    // If specific group IDs are requested, fetch per-project; otherwise fetch all
    let tasks: TodoistTask[]
    if (groupIds?.length) {
      const results = await Promise.all(
        groupIds.map((projectId) =>
          apiFetch<TodoistTask[]>(`/api/todoist/tasks?projectId=${encodeURIComponent(projectId)}`)
        )
      )
      tasks = results.flat()
    } else {
      tasks = await apiFetch<TodoistTask[]>('/api/todoist/tasks')
    }

    return tasks.map((task): UnifiedTask => {
      const project = projectMap.get(task.project_id)
      return {
        source: { provider: 'todoist', id: task.id, projectId: task.project_id },
        title: task.content,
        notes: task.description || undefined,
        completed: task.is_completed,
        priority: (task.priority >= 1 && task.priority <= 4 ? task.priority : 4) as 1 | 2 | 3 | 4,
        due: task.due?.datetime ?? task.due?.date,
        groupName: project?.name ?? 'Inbox',
        groupColor: project?.color,
      }
    })
  }

  async createTask(groupId: string, task: { title: string; notes?: string; due?: string }): Promise<void> {
    await apiFetch('/api/todoist/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: task.title,
        projectId: groupId,
        dueString: task.due,
      }),
    })
  }

  async toggleTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'todoist') return
    const action = task.completed ? 'reopen' : 'complete'
    await apiFetch(`/api/todoist/tasks/${encodeURIComponent(task.source.id)}/${action}`, {
      method: 'POST',
    })
  }

  async deleteTask(task: UnifiedTask): Promise<void> {
    if (task.source.provider !== 'todoist') return
    await apiFetch(`/api/todoist/tasks/${encodeURIComponent(task.source.id)}`, {
      method: 'DELETE',
    })
  }
}
