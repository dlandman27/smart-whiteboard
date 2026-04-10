import { useQuery } from '@tanstack/react-query'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface TaskList {
  id: string
  title: string
  updated: string
}

export interface GTask {
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

export interface GTasksStatus {
  connected: boolean
  needsReauth?: boolean
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useTasksStatus() {
  return useQuery({
    queryKey: ['gtasks-status'],
    queryFn: () => apiFetch<GTasksStatus>('/api/gtasks/status'),
    retry: false,
  })
}

export function useTaskLists() {
  return useQuery({
    queryKey: ['gtasks-lists'],
    queryFn: () => apiFetch<{ items: TaskList[] }>('/api/gtasks/lists'),
    retry: false,
  })
}

export function useTasksForList(taskListId: string, showCompleted = false) {
  return useQuery({
    queryKey: ['gtasks-tasks', taskListId, showCompleted],
    queryFn: () =>
      apiFetch<{ items: GTask[] }>(
        `/api/gtasks/tasks?taskListId=${encodeURIComponent(taskListId)}&showCompleted=${showCompleted}`
      ),
    enabled: !!taskListId,
    refetchInterval: 60_000,
  })
}

export function useAllTasks(taskListIds: string[], showCompleted = false) {
  const key = [...taskListIds].sort().join(',')
  return useQuery({
    queryKey: ['gtasks-tasks-all', key, showCompleted],
    queryFn: async () => {
      const results = await Promise.all(
        taskListIds.map(id =>
          apiFetch<{ items: GTask[] }>(
            `/api/gtasks/tasks?taskListId=${encodeURIComponent(id)}&showCompleted=${showCompleted}`
          ).then(data => (data.items ?? []).map(t => ({ ...t, _taskListId: id })))
        )
      )
      return results.flat()
    },
    enabled: taskListIds.length > 0,
    refetchInterval: 60_000,
  })
}

// ── Mutations (plain async, matching gcal pattern) ───────────────────────────

export async function createTask(
  taskListId: string,
  task: { title: string; notes?: string; due?: string },
): Promise<GTask> {
  const res = await fetch('/api/gtasks/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskListId, ...task }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to create task')
  }
  return res.json()
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Pick<GTask, 'title' | 'notes' | 'due' | 'status'>>,
): Promise<GTask> {
  const body = { ...updates } as any
  // Google Tasks requires completed=null when un-completing
  if (updates.status === 'needsAction') body.completed = null
  const res = await fetch(`/api/gtasks/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to update task')
  }
  return res.json()
}

export async function deleteTask(taskListId: string, taskId: string): Promise<void> {
  const res = await fetch(`/api/gtasks/tasks/${encodeURIComponent(taskListId)}/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to delete task')
  }
}

export async function toggleTask(taskListId: string, taskId: string, currentStatus: GTask['status']): Promise<GTask> {
  const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed'
  return updateTask(taskListId, taskId, { status: newStatus })
}
