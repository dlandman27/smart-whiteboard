import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { UnifiedTask } from '../types/unified'

// Mock the providers module
vi.mock('../providers', () => ({
  getTaskProviders: vi.fn(),
}))

import { getTaskProviders } from '../providers'
import { useUnifiedTasks, useTaskGroups } from './useUnifiedTasks'

const mockGetTaskProviders = vi.mocked(getTaskProviders)

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const gtasksTask: UnifiedTask = {
  source: { provider: 'gtasks', id: 'task-1', taskListId: 'list-1' },
  title: 'Buy groceries',
  completed: false,
  priority: 4,
  groupName: 'Shopping',
}

const completedTask: UnifiedTask = {
  source: { provider: 'gtasks', id: 'task-2', taskListId: 'list-1' },
  title: 'Finished task',
  completed: true,
  priority: 4,
  groupName: 'Shopping',
}

const todoistTask: UnifiedTask = {
  source: { provider: 'todoist', id: 'task-3', projectId: 'project-1' },
  title: 'Plan sprint',
  completed: false,
  priority: 2,
  groupName: 'Work',
}

describe('useUnifiedTasks', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('returns combined tasks from all providers on success', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([gtasksTask, completedTask]),
      },
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([todoistTask]),
      },
    ] as any)

    const { result } = renderHook(() => useUnifiedTasks(), { wrapper: makeWrapper() })

    // Without showCompleted, completed tasks are filtered out
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // completedTask is filtered by default (showCompleted = undefined/false)
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data).toContainEqual(gtasksTask)
    expect(result.current.data).toContainEqual(todoistTask)
  })

  it('includes completed tasks when showCompleted is true', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([gtasksTask, completedTask]),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedTasks(undefined, true),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data).toContainEqual(completedTask)
  })

  it('handles provider errors gracefully — returns tasks from successful providers only', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([gtasksTask]),
      },
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockRejectedValue(new Error('Todoist API error')),
      },
    ] as any)

    const { result } = renderHook(() => useUnifiedTasks(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toEqual(gtasksTask)
  })

  it('returns empty array when all providers fail', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockRejectedValue(new Error('Auth error')),
      },
    ] as any)

    const { result } = renderHook(() => useUnifiedTasks(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('filters tasks by visibleGroups when provided', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([gtasksTask]),
      },
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([todoistTask]),
      },
    ] as any)

    const visibleGroups = new Set(['gtasks:Shopping'])

    const { result } = renderHook(
      () => useUnifiedTasks(visibleGroups),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].title).toBe('Buy groceries')
  })

  it('returns all tasks when visibleGroups is empty set', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([gtasksTask]),
      },
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockResolvedValue([todoistTask]),
      },
    ] as any)

    const { result } = renderHook(
      () => useUnifiedTasks(new Set()),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('is in pending state while providers are loading', async () => {
    let resolveTasks!: (v: UnifiedTask[]) => void
    const pendingPromise = new Promise<UnifiedTask[]>(res => { resolveTasks = res })

    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn().mockReturnValue(pendingPromise),
      },
    ] as any)

    const { result } = renderHook(() => useUnifiedTasks(), { wrapper: makeWrapper() })

    expect(result.current.isSuccess).toBe(false)

    // Cleanup
    resolveTasks([])
  })
})

describe('useTaskGroups', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('returns annotated groups from all providers', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: 'gtasks-icon',
        isConnected: () => true,
        fetchGroups: vi.fn().mockResolvedValue([
          { groupName: 'Shopping', provider: 'gtasks' },
        ]),
        fetchTasks: vi.fn(),
      },
    ] as any)

    const { result } = renderHook(() => useTaskGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0]).toMatchObject({
      groupName: 'Shopping',
      key: 'gtasks:Shopping',
      providerId: 'gtasks',
      providerLabel: 'Google Tasks',
      providerIcon: 'gtasks-icon',
    })
  })

  it('skips failing providers and returns groups from the rest', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: 'gtasks-icon',
        isConnected: () => true,
        fetchGroups: vi.fn().mockResolvedValue([
          { groupName: 'Shopping', provider: 'gtasks' },
        ]),
        fetchTasks: vi.fn(),
      },
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        fetchTasks: vi.fn(),
      },
    ] as any)

    const { result } = renderHook(() => useTaskGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].providerId).toBe('gtasks')
  })

  it('returns empty array when all providers fail to fetch groups', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        fetchTasks: vi.fn(),
      },
    ] as any)

    const { result } = renderHook(() => useTaskGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})
