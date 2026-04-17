import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../lib/apiFetch'
import {
  useTasksStatus,
  useTaskLists,
  useTasksForList,
  useAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  type GTask,
  type GTasksStatus,
  type TaskList,
} from './useTasks'

const mockApiFetch = vi.mocked(apiFetch)

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const mockTaskLists: TaskList[] = [
  { id: 'list-1', title: 'My Tasks', updated: '2025-04-17T00:00:00Z' },
  { id: 'list-2', title: 'Shopping', updated: '2025-04-16T00:00:00Z' },
]

const mockGTask: GTask = {
  id: 'task-1',
  title: 'Buy groceries',
  status: 'needsAction',
  updated: '2025-04-17T00:00:00Z',
  _taskListId: 'list-1',
}

describe('useTasksStatus', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('returns connected status when fetch succeeds', async () => {
    const status: GTasksStatus = { connected: true }
    mockApiFetch.mockResolvedValueOnce(status)

    const { result } = renderHook(() => useTasksStatus(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ connected: true })
    expect(mockApiFetch).toHaveBeenCalledWith('/api/gtasks/status')
  })

  it('returns needsReauth when auth has expired', async () => {
    const status: GTasksStatus = { connected: false, needsReauth: true }
    mockApiFetch.mockResolvedValueOnce(status)

    const { result } = renderHook(() => useTasksStatus(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ connected: false, needsReauth: true })
  })

  it('enters error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'))

    const { result } = renderHook(() => useTasksStatus(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useTaskLists', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('returns task lists when fetch succeeds', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: mockTaskLists })

    const { result } = renderHook(() => useTaskLists(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].title).toBe('My Tasks')
    expect(mockApiFetch).toHaveBeenCalledWith('/api/gtasks/lists')
  })

  it('enters error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Not connected'))

    const { result } = renderHook(() => useTaskLists(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useTasksForList', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('fetches tasks for a given taskListId', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [mockGTask] })

    const { result } = renderHook(
      () => useTasksForList('list-1'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toHaveLength(1)
    expect(result.current.data?.items[0].title).toBe('Buy groceries')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/gtasks/tasks?taskListId=list-1&showCompleted=false',
    )
  })

  it('includes showCompleted=true in the URL when requested', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [mockGTask] })

    const { result } = renderHook(
      () => useTasksForList('list-1', true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/gtasks/tasks?taskListId=list-1&showCompleted=true',
    )
  })

  it('does not fetch when taskListId is empty', async () => {
    const { result } = renderHook(
      () => useTasksForList(''),
      { wrapper: makeWrapper() },
    )

    await new Promise(r => setTimeout(r, 50))
    expect(result.current.isFetching).toBe(false)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('enters error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Auth error'))

    const { result } = renderHook(
      () => useTasksForList('list-1'),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useAllTasks', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('fetches and combines tasks from all provided list IDs', async () => {
    const task1: GTask = { ...mockGTask, id: 'task-1', _taskListId: 'list-1' }
    const task2: GTask = {
      id: 'task-2',
      title: 'Milk',
      status: 'needsAction',
      updated: '2025-04-17T00:00:00Z',
      _taskListId: 'list-2',
    }

    mockApiFetch
      .mockResolvedValueOnce({ items: [task1] })
      .mockResolvedValueOnce({ items: [task2] })

    const { result } = renderHook(
      () => useAllTasks(['list-1', 'list-2']),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0]._taskListId).toBe('list-1')
    expect(result.current.data![1]._taskListId).toBe('list-2')
  })

  it('does not fetch when taskListIds is empty', async () => {
    const { result } = renderHook(
      () => useAllTasks([]),
      { wrapper: makeWrapper() },
    )

    await new Promise(r => setTimeout(r, 50))
    expect(result.current.isFetching).toBe(false)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('enters error state when a list fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('API error'))

    const { result } = renderHook(
      () => useAllTasks(['list-1']),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('handles items being null/undefined gracefully by defaulting to empty array', async () => {
    // API returns an object with no items key
    mockApiFetch.mockResolvedValueOnce({})

    const { result } = renderHook(
      () => useAllTasks(['list-1']),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})

describe('createTask (plain async)', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('posts to /api/gtasks/tasks with correct body', async () => {
    mockApiFetch.mockResolvedValueOnce(mockGTask)

    const result = await createTask('list-1', { title: 'Buy milk', notes: 'Full fat', due: '2025-04-20' })

    expect(result).toEqual(mockGTask)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/gtasks/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ taskListId: 'list-1', title: 'Buy milk', notes: 'Full fat', due: '2025-04-20' }),
      }),
    )
  })

  it('propagates API errors', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('HTTP 400'))

    await expect(createTask('list-1', { title: 'Fail' })).rejects.toThrow('HTTP 400')
  })
})

describe('updateTask (plain async)', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('patches the correct task endpoint', async () => {
    const updated = { ...mockGTask, title: 'Updated title' }
    mockApiFetch.mockResolvedValueOnce(updated)

    const result = await updateTask('list-1', 'task-1', { title: 'Updated title' })

    expect(result).toEqual(updated)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/gtasks/tasks/list-1/task-1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('adds completed=null when uncompleting a task', async () => {
    mockApiFetch.mockResolvedValueOnce(mockGTask)

    await updateTask('list-1', 'task-1', { status: 'needsAction' })

    const callBody = JSON.parse((mockApiFetch.mock.calls[0][1] as any).body)
    expect(callBody.completed).toBeNull()
    expect(callBody.status).toBe('needsAction')
  })
})

describe('deleteTask (plain async)', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('sends DELETE to the correct task endpoint', async () => {
    mockApiFetch.mockResolvedValueOnce(undefined)

    await deleteTask('list-1', 'task-1')

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/gtasks/tasks/list-1/task-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('toggleTask (plain async)', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('toggles needsAction to completed', async () => {
    const toggled = { ...mockGTask, status: 'completed' as const }
    mockApiFetch.mockResolvedValueOnce(toggled)

    const result = await toggleTask('list-1', 'task-1', 'needsAction')

    expect(result.status).toBe('completed')
    const callBody = JSON.parse((mockApiFetch.mock.calls[0][1] as any).body)
    expect(callBody.status).toBe('completed')
  })

  it('toggles completed to needsAction', async () => {
    const toggled = { ...mockGTask, status: 'needsAction' as const }
    mockApiFetch.mockResolvedValueOnce(toggled)

    const result = await toggleTask('list-1', 'task-1', 'completed')

    expect(result.status).toBe('needsAction')
    const callBody = JSON.parse((mockApiFetch.mock.calls[0][1] as any).body)
    expect(callBody.status).toBe('needsAction')
  })
})
