import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock apiFetch so providers don't make real HTTP calls
vi.mock('../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../lib/apiFetch'
import {
  getTaskProviders,
  getEventProviders,
  BuiltinTaskProvider,
  GTasksProvider,
  TodoistProvider,
  BuiltinEventProvider,
  GCalProvider,
  ICalProvider,
} from './index'

describe('getTaskProviders', () => {
  it('returns an array of task providers', () => {
    const providers = getTaskProviders()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
  })

  it('contains builtin, gtasks, and todoist providers', () => {
    const providers = getTaskProviders()
    const ids = providers.map((p) => p.id)
    expect(ids).toContain('builtin')
    expect(ids).toContain('gtasks')
    expect(ids).toContain('todoist')
  })

  it('returns the same singleton array on repeated calls', () => {
    expect(getTaskProviders()).toBe(getTaskProviders())
  })
})

describe('getEventProviders', () => {
  it('returns an array of event providers', () => {
    const providers = getEventProviders()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
  })

  it('contains builtin, gcal, and ical providers', () => {
    const providers = getEventProviders()
    const ids = providers.map((p) => p.id)
    expect(ids).toContain('builtin')
    expect(ids).toContain('gcal')
    expect(ids).toContain('ical')
  })

  it('returns the same singleton array on repeated calls', () => {
    expect(getEventProviders()).toBe(getEventProviders())
  })
})

describe('BuiltinTaskProvider', () => {
  let provider: BuiltinTaskProvider

  beforeEach(() => {
    provider = new BuiltinTaskProvider()
    vi.mocked(apiFetch).mockReset()
  })

  it('has correct id and label', () => {
    expect(provider.id).toBe('builtin')
    expect(provider.label).toBe('Wiigit Tasks')
    expect(typeof provider.icon).toBe('string')
  })

  it('isConnected returns true', () => {
    expect(provider.isConnected()).toBe(true)
  })

  it('fetchGroups maps API response to SourceGroup[]', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      { id: 'list-1', name: 'My Tasks', color: '#ff0000' },
    ])
    const groups = await provider.fetchGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual({ provider: 'builtin', groupName: 'My Tasks', color: '#ff0000' })
  })

  it('fetchTasks maps API response to UnifiedTask[]', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      { id: 't1', title: 'Buy groceries', notes: null, status: 'needsAction', priority: 2, due: null, list_name: 'My Tasks' },
    ])
    const tasks = await provider.fetchTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].source).toEqual({ provider: 'builtin', id: 't1' })
    expect(tasks[0].title).toBe('Buy groceries')
    expect(tasks[0].completed).toBe(false)
    expect(tasks[0].priority).toBe(2)
    expect(tasks[0].groupName).toBe('My Tasks')
  })

  it('fetchTasks defaults groupName to "My Tasks" when list_name is absent', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      { id: 't2', title: 'Test', status: 'needsAction', priority: 4 },
    ])
    const tasks = await provider.fetchTasks()
    expect(tasks[0].groupName).toBe('My Tasks')
  })

  it('fetchTasks marks completed tasks', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      { id: 't3', title: 'Done', status: 'completed', priority: 1 },
    ])
    const tasks = await provider.fetchTasks()
    expect(tasks[0].completed).toBe(true)
  })

  it('fetchTasks clamps invalid priority to 4', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([
      { id: 't4', title: 'Task', status: 'needsAction', priority: 99 },
    ])
    const tasks = await provider.fetchTasks()
    expect(tasks[0].priority).toBe(4)
  })

  it('createGroup calls apiFetch with POST', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({})
    await provider.createGroup!('New List')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tasks/lists',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('createTask calls apiFetch with POST', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({})
    await provider.createTask!('My Tasks', { title: 'New task', priority: 2 })
    expect(apiFetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ method: 'POST' }))
  })

  it('toggleTask calls PATCH on the task', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({})
    const task = {
      source: { provider: 'builtin' as const, id: 'task-1' },
      title: 'T', completed: false, priority: 2 as const, groupName: 'G',
    }
    await provider.toggleTask!(task)
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('toggleTask is a no-op for non-builtin tasks', async () => {
    const task = {
      source: { provider: 'gtasks' as const, id: 'task-x' },
      title: 'T', completed: false, priority: 2 as const, groupName: 'G',
    }
    await provider.toggleTask!(task)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('deleteTask calls DELETE on the task', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({})
    const task = {
      source: { provider: 'builtin' as const, id: 'task-2' },
      title: 'T', completed: false, priority: 2 as const, groupName: 'G',
    }
    await provider.deleteTask!(task)
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tasks/task-2',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('deleteTask is a no-op for non-builtin tasks', async () => {
    const task = {
      source: { provider: 'gtasks' as const, id: 'task-y' },
      title: 'T', completed: false, priority: 2 as const, groupName: 'G',
    }
    await provider.deleteTask!(task)
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe('Provider interface conformance', () => {
  it('GTasksProvider has required interface fields', () => {
    const p = new GTasksProvider()
    expect(typeof p.id).toBe('string')
    expect(typeof p.label).toBe('string')
    expect(typeof p.icon).toBe('string')
    expect(typeof p.isConnected).toBe('function')
    expect(typeof p.fetchGroups).toBe('function')
    expect(typeof p.fetchTasks).toBe('function')
  })

  it('TodoistProvider has required interface fields', () => {
    const p = new TodoistProvider()
    expect(typeof p.id).toBe('string')
    expect(typeof p.label).toBe('string')
    expect(typeof p.isConnected).toBe('function')
  })

  it('BuiltinEventProvider has required interface fields', () => {
    const p = new BuiltinEventProvider()
    expect(typeof p.id).toBe('string')
    expect(typeof p.label).toBe('string')
    expect(p.isConnected()).toBe(true)
    expect(typeof p.fetchGroups).toBe('function')
    expect(typeof p.fetchEvents).toBe('function')
  })

  it('GCalProvider has required interface fields', () => {
    const p = new GCalProvider()
    expect(typeof p.id).toBe('string')
    expect(typeof p.fetchEvents).toBe('function')
  })

  it('ICalProvider has required interface fields', () => {
    const p = new ICalProvider()
    expect(typeof p.id).toBe('string')
    expect(typeof p.fetchEvents).toBe('function')
  })
})
