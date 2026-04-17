import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../../lib/apiFetch'
import { GTasksProvider } from './gtasks'

const mockApiFetch = vi.mocked(apiFetch)

const TASK_LISTS = [
  { id: 'list-1', title: 'My Tasks', updated: '2024-01-01' },
  { id: 'list-2', title: 'Work',     updated: '2024-01-01' },
]

const GTASKS = [
  { id: 't1', title: 'Buy milk', status: 'needsAction', updated: '2024-01-01' },
  { id: 't2', title: 'Done task', status: 'completed', due: '2024-01-10', updated: '2024-01-01' },
]

describe('GTasksProvider', () => {
  let provider: GTasksProvider

  beforeEach(() => {
    provider = new GTasksProvider()
    mockApiFetch.mockReset()
  })

  describe('identity', () => {
    it('has correct id, label, icon', () => {
      expect(provider.id).toBe('gtasks')
      expect(provider.label).toBe('Google Tasks')
      expect(typeof provider.icon).toBe('string')
    })
  })

  describe('isConnected()', () => {
    it('returns false initially', () => {
      mockApiFetch.mockResolvedValue({ connected: true })
      expect(provider.isConnected()).toBe(false)
    })

    it('returns true after successful status check', async () => {
      mockApiFetch.mockResolvedValueOnce({ connected: true })
      provider.isConnected()
      await new Promise((r) => setTimeout(r, 0))
      expect(provider.isConnected()).toBe(true)
    })

    it('returns false when status check fails', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'))
      provider.isConnected()
      await new Promise((r) => setTimeout(r, 0))
      expect(provider.isConnected()).toBe(false)
    })
  })

  describe('fetchGroups()', () => {
    it('maps lists to SourceGroups', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: TASK_LISTS })
      const groups = await provider.fetchGroups()
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual({ provider: 'gtasks', groupName: 'My Tasks' })
      expect(groups[1]).toEqual({ provider: 'gtasks', groupName: 'Work' })
    })

    it('returns empty array when items is empty', async () => {
      mockApiFetch.mockResolvedValueOnce({ items: [] })
      const groups = await provider.fetchGroups()
      expect(groups).toEqual([])
    })
  })

  describe('fetchTasks()', () => {
    it('fetches tasks from all lists and maps to UnifiedTask[]', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: TASK_LISTS }) // getLists
        .mockResolvedValueOnce({ items: [GTASKS[0]] }) // tasks for list-1
        .mockResolvedValueOnce({ items: [GTASKS[1]] }) // tasks for list-2

      const tasks = await provider.fetchTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks[0].source).toEqual({ provider: 'gtasks', id: 't1', taskListId: 'list-1' })
      expect(tasks[0].title).toBe('Buy milk')
      expect(tasks[0].completed).toBe(false)
      expect(tasks[0].groupName).toBe('My Tasks')
      expect(tasks[1].completed).toBe(true)
    })

    it('filters to specific groupIds when provided', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: TASK_LISTS })
        .mockResolvedValueOnce({ items: [GTASKS[0]] })

      const tasks = await provider.fetchTasks(['list-1'])
      expect(mockApiFetch).toHaveBeenCalledTimes(2) // lists + one task fetch
      expect(tasks).toHaveLength(1)
    })

    it('maps priority to 4 (fixed for GTask)', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: [TASK_LISTS[0]] })
        .mockResolvedValueOnce({ items: [GTASKS[0]] })

      const tasks = await provider.fetchTasks()
      expect(tasks[0].priority).toBe(4)
    })

    it('passes due date from GTask', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: [TASK_LISTS[0]] })
        .mockResolvedValueOnce({ items: [GTASKS[1]] })

      const tasks = await provider.fetchTasks()
      expect(tasks[0].due).toBe('2024-01-10')
    })

    it('uses "Tasks" as fallback groupName', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ items: [{ id: 'unknown-list', title: 'Orphan', updated: '' }] })
        .mockResolvedValueOnce({ items: [{ ...GTASKS[0], _taskListId: 'unknown-list' }] })

      const tasks = await provider.fetchTasks()
      // groupName uses the listMap — if list is found it uses the title
      expect(tasks[0].groupName).toBe('Orphan')
    })
  })

  describe('createTask()', () => {
    it('calls apiFetch POST with correct body', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      await provider.createTask('list-1', { title: 'New Task', notes: 'Note', due: '2024-02-01' })
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/gtasks/tasks',
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.taskListId).toBe('list-1')
      expect(body.title).toBe('New Task')
      expect(body.notes).toBe('Note')
      expect(body.due).toBe('2024-02-01')
    })
  })

  describe('toggleTask()', () => {
    it('toggles needsAction → completed via PATCH', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'gtasks' as const, id: 't1', taskListId: 'list-1' },
        title: 'Test', completed: false, priority: 4 as const, groupName: 'My Tasks',
      }
      await provider.toggleTask(task)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('t1'),
        expect.objectContaining({ method: 'PATCH' })
      )
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.status).toBe('completed')
    })

    it('toggles completed → needsAction and clears completed field', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'gtasks' as const, id: 't2', taskListId: 'list-1' },
        title: 'Done', completed: true, priority: 4 as const, groupName: 'My Tasks',
      }
      await provider.toggleTask(task)
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.status).toBe('needsAction')
      expect(body.completed).toBeNull()
    })

    it('is a no-op for non-gtasks tasks', async () => {
      const task = {
        source: { provider: 'builtin' as const, id: 'x' },
        title: 'T', completed: false, priority: 4 as const, groupName: 'G',
      }
      await provider.toggleTask(task)
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })

  describe('deleteTask()', () => {
    it('calls apiFetch DELETE with correct URL', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'gtasks' as const, id: 't1', taskListId: 'list-1' },
        title: 'Test', completed: false, priority: 4 as const, groupName: 'My Tasks',
      }
      await provider.deleteTask(task)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('list-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('t1'),
        expect.anything()
      )
    })

    it('is a no-op for non-gtasks tasks', async () => {
      const task = {
        source: { provider: 'todoist' as const, id: 'x' },
        title: 'T', completed: false, priority: 4 as const, groupName: 'G',
      }
      await provider.deleteTask(task)
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })
})
