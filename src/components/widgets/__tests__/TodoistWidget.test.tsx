import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@whiteboard/sdk', () => ({
  useWidgetSettings: vi.fn().mockReturnValue([{
    projectId: '',
    filter: '',
    showCompleted: false,
    showProject: true,
  }, vi.fn()]),
}))

vi.mock('@whiteboard/ui-kit', async () => {
  const actual = await vi.importActual('@whiteboard/ui-kit')
  return {
    ...actual,
    useWidgetSizeContext: vi.fn().mockReturnValue({ containerWidth: 400, containerHeight: 300 }),
  }
})

import { TodoistWidget } from '../TodoistWidget'
import { useWidgetSettings } from '@whiteboard/sdk'

const DEFAULT_SETTINGS = {
  projectId: '',
  filter: '',
  showCompleted: false,
  showProject: true,
}

// Factory helpers — always create fresh Response objects since body is single-read
const makeConnected  = () => new Response(JSON.stringify({ connected: true }))
const makeDisconnected = () => new Response(JSON.stringify({ connected: false }))
const makeProjects   = (projects: any[] = []) => new Response(JSON.stringify(projects))
const makeTasks      = (tasks: any[] = []) => new Response(JSON.stringify(tasks))

/** Spy on fetch and return a sequence of fresh Responses per call. */
function mockFetchSequence(factories: Array<() => Response>) {
  let callIndex = 0
  vi.spyOn(global, 'fetch').mockImplementation(() => {
    const factory = factories[callIndex] ?? factories[factories.length - 1]
    callIndex++
    return Promise.resolve(factory())
  })
}

describe('TodoistWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWidgetSettings).mockReturnValue([DEFAULT_SETTINGS, vi.fn()])
  })

  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<TodoistWidget widgetId="test-todoist-1" />)
  })

  it('shows loading state while checking connection', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    render(<TodoistWidget widgetId="test-todoist-2" />)
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument()
  })

  it('shows not connected state when Todoist is not linked', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(makeDisconnected())
    render(<TodoistWidget widgetId="test-todoist-3" />)
    await waitFor(() => {
      expect(screen.getByText(/connect todoist/i)).toBeInTheDocument()
    })
  })

  it('shows empty task list when connected but no tasks', async () => {
    mockFetchSequence([makeConnected, makeProjects, makeTasks])
    render(<TodoistWidget widgetId="test-todoist-4" />)
    await waitFor(() => {
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument()
    })
  })

  it('shows error state when task fetch fails', async () => {
    mockFetchSequence([
      makeConnected,
      makeProjects,
      () => new Response('Server Error', { status: 500 }),
    ])
    render(<TodoistWidget widgetId="test-todoist-5" />)
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument()
    })
  })

  it('renders tasks when connected and data available', async () => {
    const tasks = [
      { id: 't1', content: 'Write tests', description: '', is_completed: false, priority: 4, due: null, project_id: 'p1' },
      { id: 't2', content: 'Review PR', description: '', is_completed: false, priority: 2, due: null, project_id: 'p1' },
    ]
    mockFetchSequence([
      makeConnected,
      () => makeProjects([{ id: 'p1', name: 'Work', color: 'blue' }]),
      () => makeTasks(tasks),
    ])
    render(<TodoistWidget widgetId="test-todoist-6" />)
    await waitFor(() => {
      expect(screen.getByText('Write tests')).toBeInTheDocument()
      expect(screen.getByText('Review PR')).toBeInTheDocument()
    })
  })

  it('shows Todoist header when tasks are loaded', async () => {
    const tasks = [
      { id: 't1', content: 'Do something', description: '', is_completed: false, priority: 4, due: null, project_id: 'p1' },
    ]
    mockFetchSequence([makeConnected, makeProjects, () => makeTasks(tasks)])
    render(<TodoistWidget widgetId="test-todoist-7" />)
    await waitFor(() => {
      expect(screen.getByText('Todoist')).toBeInTheDocument()
    })
  })

  it('hides completed tasks when showCompleted is false', async () => {
    const tasks = [
      { id: 't1', content: 'Active task', description: '', is_completed: false, priority: 4, due: null, project_id: 'p1' },
      { id: 't2', content: 'Done task', description: '', is_completed: true, priority: 4, due: null, project_id: 'p1' },
    ]
    mockFetchSequence([makeConnected, makeProjects, () => makeTasks(tasks)])
    render(<TodoistWidget widgetId="test-todoist-8" />)
    await waitFor(() => {
      expect(screen.getByText('Active task')).toBeInTheDocument()
    })
    expect(screen.queryByText('Done task')).not.toBeInTheDocument()
  })

  it('shows completed tasks when showCompleted is true', async () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      ...DEFAULT_SETTINGS,
      showCompleted: true,
    }, vi.fn()])
    const tasks = [
      { id: 't1', content: 'Active task', description: '', is_completed: false, priority: 4, due: null, project_id: 'p1' },
      { id: 't2', content: 'Done task', description: '', is_completed: true, priority: 4, due: null, project_id: 'p1' },
    ]
    mockFetchSequence([makeConnected, makeProjects, () => makeTasks(tasks)])
    render(<TodoistWidget widgetId="test-todoist-9" />)
    await waitFor(() => {
      expect(screen.getByText('Active task')).toBeInTheDocument()
      expect(screen.getByText('Done task')).toBeInTheDocument()
    })
  })
})
