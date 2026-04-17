import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  toggleUnifiedTask,
  deleteUnifiedTask,
  createUnifiedGroup,
  createUnifiedTask,
} from './useTaskMutations'
import type { UnifiedTask } from '../types/unified'

// Mock the providers module
vi.mock('../providers', () => ({
  getTaskProviders: vi.fn(),
}))

import { getTaskProviders } from '../providers'

const mockGetTaskProviders = vi.mocked(getTaskProviders)

const mockTask: UnifiedTask = {
  source: { provider: 'gtasks', id: 'task-1', taskListId: 'list-1' },
  title: 'Buy groceries',
  completed: false,
  priority: 4,
  groupName: 'Shopping',
}

describe('toggleUnifiedTask', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('calls toggleTask on the matching provider', async () => {
    const mockToggleTask = vi.fn().mockResolvedValue(undefined)
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        toggleTask: mockToggleTask,
      },
    ] as any)

    await toggleUnifiedTask(mockTask)
    expect(mockToggleTask).toHaveBeenCalledWith(mockTask)
  })

  it('throws when provider is not found', async () => {
    mockGetTaskProviders.mockReturnValue([])
    await expect(toggleUnifiedTask(mockTask)).rejects.toThrow(
      'Provider "gtasks" does not support toggling tasks',
    )
  })

  it('throws when provider does not support toggleTask', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        // no toggleTask
      },
    ] as any)

    await expect(toggleUnifiedTask(mockTask)).rejects.toThrow(
      'Provider "gtasks" does not support toggling tasks',
    )
  })

  it('propagates errors from the provider toggleTask call', async () => {
    const mockToggleTask = vi.fn().mockRejectedValue(new Error('Toggle failed'))
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        toggleTask: mockToggleTask,
      },
    ] as any)

    await expect(toggleUnifiedTask(mockTask)).rejects.toThrow('Toggle failed')
  })
})

describe('deleteUnifiedTask', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('calls deleteTask on the matching provider', async () => {
    const mockDeleteTask = vi.fn().mockResolvedValue(undefined)
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        deleteTask: mockDeleteTask,
      },
    ] as any)

    await deleteUnifiedTask(mockTask)
    expect(mockDeleteTask).toHaveBeenCalledWith(mockTask)
  })

  it('throws when provider is not found', async () => {
    mockGetTaskProviders.mockReturnValue([])
    await expect(deleteUnifiedTask(mockTask)).rejects.toThrow(
      'Provider "gtasks" does not support deleting tasks',
    )
  })

  it('throws when provider does not support deleteTask', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        // no deleteTask
      },
    ] as any)

    await expect(deleteUnifiedTask(mockTask)).rejects.toThrow(
      'Provider "gtasks" does not support deleting tasks',
    )
  })

  it('propagates errors from the provider deleteTask call', async () => {
    const mockDeleteTask = vi.fn().mockRejectedValue(new Error('Delete failed'))
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        deleteTask: mockDeleteTask,
      },
    ] as any)

    await expect(deleteUnifiedTask(mockTask)).rejects.toThrow('Delete failed')
  })
})

describe('createUnifiedGroup', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('calls createGroup on the matching provider', async () => {
    const mockCreateGroup = vi.fn().mockResolvedValue(undefined)
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        createGroup: mockCreateGroup,
      },
    ] as any)

    await createUnifiedGroup('todoist', 'Work Projects')
    expect(mockCreateGroup).toHaveBeenCalledWith('Work Projects')
  })

  it('throws when provider is not found', async () => {
    mockGetTaskProviders.mockReturnValue([])
    await expect(createUnifiedGroup('nonexistent', 'My List')).rejects.toThrow(
      'Provider "nonexistent" does not support creating groups',
    )
  })

  it('throws when provider does not support createGroup', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'todoist',
        label: 'Todoist',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        // no createGroup
      },
    ] as any)

    await expect(createUnifiedGroup('todoist', 'My List')).rejects.toThrow(
      'Provider "todoist" does not support creating groups',
    )
  })
})

describe('createUnifiedTask', () => {
  beforeEach(() => {
    mockGetTaskProviders.mockReset()
  })

  it('calls createTask on the matching provider with the correct arguments', async () => {
    const mockCreateTask = vi.fn().mockResolvedValue(undefined)
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        createTask: mockCreateTask,
      },
    ] as any)

    const task = { title: 'Write tests', notes: 'Use Vitest', due: '2025-04-30', priority: 1 }
    await createUnifiedTask('gtasks', 'list-1', task)
    expect(mockCreateTask).toHaveBeenCalledWith('list-1', task)
  })

  it('throws when provider is not found', async () => {
    mockGetTaskProviders.mockReturnValue([])
    await expect(
      createUnifiedTask('nonexistent', 'list-1', { title: 'Test' }),
    ).rejects.toThrow('Provider "nonexistent" does not support creating tasks')
  })

  it('throws when provider does not support createTask', async () => {
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'builtin',
        label: 'Built-in',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        // no createTask
      },
    ] as any)

    await expect(
      createUnifiedTask('builtin', 'list-1', { title: 'Test' }),
    ).rejects.toThrow('Provider "builtin" does not support creating tasks')
  })

  it('propagates errors from the provider createTask call', async () => {
    const mockCreateTask = vi.fn().mockRejectedValue(new Error('Create failed'))
    mockGetTaskProviders.mockReturnValue([
      {
        id: 'gtasks',
        label: 'Google Tasks',
        icon: '',
        isConnected: () => true,
        fetchGroups: vi.fn(),
        fetchTasks: vi.fn(),
        createTask: mockCreateTask,
      },
    ] as any)

    await expect(
      createUnifiedTask('gtasks', 'list-1', { title: 'Broken task' }),
    ).rejects.toThrow('Create failed')
  })
})
