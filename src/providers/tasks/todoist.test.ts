import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../../lib/apiFetch'
import { TodoistProvider } from './todoist'

const mockApiFetch = vi.mocked(apiFetch)

const PROJECTS = [
  { id: 'proj-1', name: 'Inbox', color: 'blue' },
  { id: 'proj-2', name: 'Work',  color: 'red' },
]

const TASKS: any[] = [
  { id: 'task-1', content: 'Buy groceries', description: '', is_completed: false, priority: 2, project_id: 'proj-1' },
  { id: 'task-2', content: 'Send report',   description: 'Q4 report', is_completed: false, priority: 3, project_id: 'proj-2', due: { date: '2024-02-01', string: 'Feb 1' } },
]

describe('TodoistProvider', () => {
  let provider: TodoistProvider

  beforeEach(() => {
    provider = new TodoistProvider()
    mockApiFetch.mockReset()
  })

  describe('identity', () => {
    it('has correct id, label, icon', () => {
      expect(provider.id).toBe('todoist')
      expect(provider.label).toBe('Todoist')
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
    it('maps projects to SourceGroups', async () => {
      mockApiFetch.mockResolvedValueOnce(PROJECTS)
      const groups = await provider.fetchGroups()
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual({ provider: 'todoist', groupName: 'Inbox', color: 'blue' })
      expect(groups[1]).toEqual({ provider: 'todoist', groupName: 'Work',  color: 'red' })
    })

    it('uses projects cache within 2 minutes', async () => {
      mockApiFetch.mockResolvedValueOnce(PROJECTS)
      await provider.fetchGroups()
      await provider.fetchGroups()
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchTasks()', () => {
    it('fetches all tasks when no groupIds provided', async () => {
      mockApiFetch
        .mockResolvedValueOnce(PROJECTS) // _getProjects
        .mockResolvedValueOnce(TASKS)    // /api/todoist/tasks

      const tasks = await provider.fetchTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks[0].source).toEqual({ provider: 'todoist', id: 'task-1', projectId: 'proj-1' })
      expect(tasks[0].title).toBe('Buy groceries')
      expect(tasks[0].completed).toBe(false)
      expect(tasks[0].priority).toBe(2)
      expect(tasks[0].groupName).toBe('Inbox')
      expect(tasks[0].groupColor).toBe('blue')
    })

    it('fetches per-project when groupIds provided', async () => {
      mockApiFetch
        .mockResolvedValueOnce(PROJECTS)         // _getProjects
        .mockResolvedValueOnce([TASKS[1]])       // tasks for proj-2

      const tasks = await provider.fetchTasks(['proj-2'])
      expect(tasks).toHaveLength(1)
      expect(tasks[0].groupName).toBe('Work')
    })

    it('maps description to notes when non-empty', async () => {
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([TASKS[1]])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].notes).toBe('Q4 report')
    })

    it('maps empty description to undefined', async () => {
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([TASKS[0]])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].notes).toBeUndefined()
    })

    it('maps due date from datetime', async () => {
      const taskWithDatetime = { ...TASKS[1], due: { date: '2024-02-01', string: 'Feb 1', datetime: '2024-02-01T09:00:00Z' } }
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([taskWithDatetime])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].due).toBe('2024-02-01T09:00:00Z')
    })

    it('maps due date from date when no datetime', async () => {
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([TASKS[1]])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].due).toBe('2024-02-01')
    })

    it('clamps invalid priority to 4', async () => {
      const badPriority = { ...TASKS[0], priority: 99 }
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([badPriority])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].priority).toBe(4)
    })

    it('uses "Inbox" as groupName when project not found', async () => {
      const unknownProject = { ...TASKS[0], project_id: 'not-a-project' }
      mockApiFetch.mockResolvedValueOnce(PROJECTS).mockResolvedValueOnce([unknownProject])
      const tasks = await provider.fetchTasks()
      expect(tasks[0].groupName).toBe('Inbox')
    })
  })

  describe('createGroup()', () => {
    it('calls apiFetch POST for new project', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      await provider.createGroup('Shopping')
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/todoist/projects',
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.name).toBe('Shopping')
    })
  })

  describe('createTask()', () => {
    it('calls apiFetch POST with correct body', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      await provider.createTask('proj-1', { title: 'New Task', due: 'tomorrow' })
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/todoist/tasks',
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
      expect(body.content).toBe('New Task')
      expect(body.projectId).toBe('proj-1')
      expect(body.dueString).toBe('tomorrow')
    })
  })

  describe('toggleTask()', () => {
    it('calls complete endpoint for incomplete task', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'todoist' as const, id: 'task-1' },
        title: 'T', completed: false, priority: 2 as const, groupName: 'G',
      }
      await provider.toggleTask(task)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('complete'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('calls reopen endpoint for completed task', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'todoist' as const, id: 'task-1' },
        title: 'T', completed: true, priority: 2 as const, groupName: 'G',
      }
      await provider.toggleTask(task)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('reopen'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('is a no-op for non-todoist tasks', async () => {
      const task = {
        source: { provider: 'gtasks' as const, id: 'x', taskListId: 'l' },
        title: 'T', completed: false, priority: 4 as const, groupName: 'G',
      }
      await provider.toggleTask(task)
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })

  describe('deleteTask()', () => {
    it('calls apiFetch DELETE', async () => {
      mockApiFetch.mockResolvedValueOnce({})
      const task = {
        source: { provider: 'todoist' as const, id: 'task-1' },
        title: 'T', completed: false, priority: 2 as const, groupName: 'G',
      }
      await provider.deleteTask(task)
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('task-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('is a no-op for non-todoist tasks', async () => {
      const task = {
        source: { provider: 'builtin' as const, id: 'x' },
        title: 'T', completed: false, priority: 4 as const, groupName: 'G',
      }
      await provider.deleteTask(task)
      expect(mockApiFetch).not.toHaveBeenCalled()
    })
  })
})
