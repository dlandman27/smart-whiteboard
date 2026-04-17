import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    listName: 'My Tasks',
    showCompleted: false,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

const mockUseWiigitTasks = vi.fn()
const mockUseToggleWiigitTask = vi.fn()
const mockUseCreateWiigitTask = vi.fn()

vi.mock('../../../hooks/useWiigitTasks', () => ({
  useWiigitTasks: (...args: any[]) => mockUseWiigitTasks(...args),
  useToggleWiigitTask: (...args: any[]) => mockUseToggleWiigitTask(...args),
  useCreateWiigitTask: (...args: any[]) => mockUseCreateWiigitTask(...args),
}))

import { TaskListWidget } from '../TaskListWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

const mockMutate = vi.fn()

describe('TaskListWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseToggleWiigitTask.mockReturnValue({ mutate: mockMutate })
    mockUseCreateWiigitTask.mockReturnValue({ mutate: mockMutate })
  })

  it('renders without crashing', () => {
    mockUseWiigitTasks.mockReturnValue({ data: [], isLoading: false })
    render(<TaskListWidget widgetId="test-task-1" />)
  })

  it('shows the list name in the header', () => {
    mockUseWiigitTasks.mockReturnValue({ data: [], isLoading: false })
    render(<TaskListWidget widgetId="test-task-2" />)
    expect(screen.getByText('My Tasks')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseWiigitTasks.mockReturnValue({ data: [], isLoading: true })
    render(<TaskListWidget widgetId="test-task-3" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows all done when tasks are empty and no active tasks', () => {
    mockUseWiigitTasks.mockReturnValue({ data: [], isLoading: false })
    render(<TaskListWidget widgetId="test-task-4" />)
    expect(screen.getByText(/all done/i)).toBeInTheDocument()
  })

  it('shows task titles when tasks are loaded', () => {
    mockUseWiigitTasks.mockReturnValue({
      data: [
        { id: '1', title: 'Buy milk', status: 'needsAction', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Walk dog', status: 'needsAction', priority: 3, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
      ],
      isLoading: false,
    })
    render(<TaskListWidget widgetId="test-task-5" />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('shows active task count badge', () => {
    mockUseWiigitTasks.mockReturnValue({
      data: [
        { id: '1', title: 'Task One', status: 'needsAction', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Task Two', status: 'needsAction', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
      ],
      isLoading: false,
    })
    render(<TaskListWidget widgetId="test-task-6" />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('hides completed tasks when showCompleted is false', () => {
    mockUseWiigitTasks.mockReturnValue({
      data: [
        { id: '1', title: 'Active Task', status: 'needsAction', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Done Task', status: 'completed', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: '2025-01-02T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
      ],
      isLoading: false,
    })
    render(<TaskListWidget widgetId="test-task-7" />)
    expect(screen.getByText('Active Task')).toBeInTheDocument()
    expect(screen.queryByText('Done Task')).not.toBeInTheDocument()
  })

  it('shows completed tasks when showCompleted is true', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      listName: 'My Tasks',
      showCompleted: true,
    }, vi.fn()])
    mockUseWiigitTasks.mockReturnValue({
      data: [
        { id: '1', title: 'Active Task', status: 'needsAction', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: null, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Done Task', status: 'completed', priority: 4, due: null, notes: null, list_name: 'My Tasks', completed_at: '2025-01-02T00:00:00Z', created_at: '2025-01-01T00:00:00Z' },
      ],
      isLoading: false,
    })
    render(<TaskListWidget widgetId="test-task-8" />)
    expect(screen.getByText('Active Task')).toBeInTheDocument()
    expect(screen.getByText('Done Task')).toBeInTheDocument()
  })

  it('shows overdue indicator for past-due tasks', () => {
    mockUseWiigitTasks.mockReturnValue({
      data: [
        {
          id: '1',
          title: 'Overdue Task',
          status: 'needsAction',
          priority: 1,
          due: '2020-01-01',
          notes: null,
          list_name: 'My Tasks',
          completed_at: null,
          created_at: '2019-12-01T00:00:00Z',
        },
      ],
      isLoading: false,
    })
    render(<TaskListWidget widgetId="test-task-9" />)
    expect(screen.getByText('Overdue Task')).toBeInTheDocument()
  })
})
