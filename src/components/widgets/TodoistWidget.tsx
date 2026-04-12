import { useEffect, useState, useCallback } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { Container, Center, Text, Icon, useWidgetSizeContext } from '@whiteboard/ui-kit'
import { apiFetch } from '../../lib/apiFetch'

export interface TodoistSettings {
  projectId?:    string
  filter?:       string
  showCompleted: boolean
  showProject:   boolean
}

export const DEFAULT_TODOIST_SETTINGS: TodoistSettings = {
  projectId:     '',
  filter:        '',
  showCompleted: false,
  showProject:   true,
}

interface TodoistTask {
  id:          string
  content:     string
  description: string
  is_completed: boolean
  priority:    number   // 1=urgent(p1), 2=high(p2), 3=medium(p3), 4=normal(p4)
  due?:        { date: string; string: string; datetime?: string }
  project_id:  string
}

interface TodoistProject {
  id:   string
  name: string
  color: string
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#dc2626', // p1 — red
  2: '#f97316', // p2 — orange
  3: '#3b82f6', // p3 — blue
  4: '#6b7280', // p4 — gray
}

function isOverdue(task: TodoistTask): boolean {
  if (!task.due?.date) return false
  const dueDate = new Date(task.due.datetime ?? task.due.date + 'T23:59:59')
  return dueDate < new Date()
}

function formatDue(task: TodoistTask): string | null {
  if (!task.due?.date) return null
  const d = new Date(task.due.datetime ?? task.due.date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateOnly = new Date(d)
  dateOnly.setHours(0, 0, 0, 0)

  if (dateOnly.getTime() === today.getTime()) return 'Today'
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Widget ──────────────────────────────────────────────────────────────────

export function TodoistWidget({ widgetId }: { widgetId: string }) {
  return (
    <Container className="flex flex-col overflow-hidden" style={{ background: 'var(--wt-bg)', borderRadius: 'inherit' }}>
      <TodoistContent widgetId={widgetId} />
    </Container>
  )
}

function TodoistContent({ widgetId }: { widgetId: string }) {
  const { containerHeight } = useWidgetSizeContext()
  const [settings] = useWidgetSettings<TodoistSettings>(widgetId, DEFAULT_TODOIST_SETTINGS)

  const [tasks, setTasks]       = useState<TodoistTask[]>([])
  const [projects, setProjects] = useState<TodoistProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [newTask, setNewTask]   = useState('')
  const [adding, setAdding]     = useState(false)

  // Check connection status
  useEffect(() => {
    apiFetch<{ connected: boolean }>('/api/todoist/status')
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false))
  }, [])

  // Fetch projects for name lookups
  useEffect(() => {
    if (!connected) return
    apiFetch<TodoistProject[]>('/api/todoist/projects')
      .then(setProjects)
      .catch(() => {})
  }, [connected])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (connected === null || !connected) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (settings.projectId) params.set('projectId', settings.projectId)
      if (settings.filter)    params.set('filter', settings.filter)
      const qs = params.toString()
      const data = await apiFetch<TodoistTask[]>(`/api/todoist/tasks${qs ? `?${qs}` : ''}`)
      setTasks(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [connected, settings.projectId, settings.filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!connected) return
    const id = setInterval(fetchTasks, 2 * 60_000)
    return () => clearInterval(id)
  }, [fetchTasks, connected])

  // Complete / reopen
  async function toggleTask(taskId: string, completed: boolean) {
    setCompleting((s) => new Set(s).add(taskId))
    // Optimistic update
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, is_completed: !completed } : t
    ))
    try {
      const action = completed ? 'reopen' : 'complete'
      await apiFetch(`/api/todoist/tasks/${taskId}/${action}`, { method: 'POST' })
    } catch {
      // Revert on error
      setTasks((prev) => prev.map((t) =>
        t.id === taskId ? { ...t, is_completed: completed } : t
      ))
    } finally {
      setCompleting((s) => { const n = new Set(s); n.delete(taskId); return n })
    }
  }

  // Quick-add
  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || adding) return
    setAdding(true)
    try {
      const body: any = { content: newTask.trim() }
      if (settings.projectId) body.projectId = settings.projectId
      await apiFetch('/api/todoist/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setNewTask('')
      fetchTasks()
    } catch { /* ignore */ } finally {
      setAdding(false)
    }
  }

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))

  // ── Not connected ─────────────────────────────────────────────────────────
  if (connected === false) {
    return (
      <Center fullHeight className="px-6">
        <div className="text-center">
          <Icon icon="CheckCircle" size={28} style={{ marginBottom: 8, color: 'var(--wt-text-muted)' }} />
          <Text variant="body" size="small" color="muted" align="center">
            Connect Todoist in Connectors to see your tasks
          </Text>
        </div>
      </Center>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (connected === null || (loading && tasks.length === 0)) {
    return (
      <Center fullHeight>
        <Text variant="body" size="small" color="muted" className="animate-pulse">Loading tasks...</Text>
      </Center>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && tasks.length === 0) {
    return (
      <Center fullHeight className="px-6">
        <Text variant="body" size="small" color="muted" align="center">{error}</Text>
      </Center>
    )
  }

  // Filter out completed if setting is off
  const visibleTasks = settings.showCompleted
    ? tasks
    : tasks.filter((t) => !t.is_completed)

  const isCompact = containerHeight < 300

  return (
    <div className="flex flex-col h-full p-3 gap-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 px-1 flex-shrink-0">
        <Icon icon="CheckCircle" size={14} style={{ color: '#e44332' }} />
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--wt-text)' }}>
          Todoist
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--wt-text-muted)', opacity: 0.5 }}>
          {visibleTasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>
        {visibleTasks.length === 0 ? (
          <Center fullHeight>
            <Text variant="body" size="small" color="muted">No tasks</Text>
          </Center>
        ) : (
          visibleTasks.map((task) => {
            const overdue = isOverdue(task)
            const due = formatDue(task)
            const isCompleting = completing.has(task.id)

            return (
              <div
                key={task.id}
                className="flex items-start gap-2 px-1 py-1.5 rounded-lg group"
                style={{
                  borderBottom: '1px solid var(--wt-border)',
                  opacity: task.is_completed ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id, task.is_completed)}
                  disabled={isCompleting}
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `2px solid ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS[4]}`,
                    background: task.is_completed ? PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS[4] : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  {task.is_completed && (
                    <Icon icon="Check" size={10} style={{ color: '#fff' }} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs leading-snug"
                    style={{
                      color: 'var(--wt-text)',
                      textDecoration: task.is_completed ? 'line-through' : 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: isCompact ? 1 : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {task.content}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {due && (
                      <span className="text-xs" style={{
                        color: overdue ? '#dc2626' : 'var(--wt-text-muted)',
                        fontWeight: overdue ? 600 : 400,
                        fontSize: 10,
                      }}>
                        {due}
                      </span>
                    )}
                    {settings.showProject && projectMap[task.project_id] && (
                      <span className="text-xs" style={{ color: 'var(--wt-text-muted)', opacity: 0.6, fontSize: 10 }}>
                        {projectMap[task.project_id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Quick-add */}
      <form onSubmit={addTask} className="flex gap-1.5 mt-1 flex-shrink-0">
        <input
          className="wt-input flex-1 rounded-lg px-2.5 text-xs"
          style={{ height: 28, minWidth: 0 }}
          placeholder="Add a task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          disabled={adding}
        />
        <button
          type="submit"
          disabled={!newTask.trim() || adding}
          className="flex-shrink-0 rounded-lg flex items-center justify-center"
          style={{
            width: 28, height: 28,
            background: newTask.trim() ? '#e44332' : 'var(--wt-surface-hover)',
            color: newTask.trim() ? '#fff' : 'var(--wt-text-muted)',
            border: 'none', cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          <Icon icon="Plus" size={14} />
        </button>
      </form>
    </div>
  )
}
