import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, Button, ScrollArea, Checkbox, Input,
} from '@whiteboard/ui-kit'
import {
  useTasksStatus, useTaskLists, useAllTasks,
  createTask, toggleTask, deleteTask,
  type GTask, type TaskList,
} from '../hooks/useTasks'
import { startGCalAuth } from '../hooks/useGCal'

// ── Helpers ──────────────────────────────────────────────────────────────────

function dueDateLabel(due?: string): { text: string; color: string } | null {
  if (!due) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due); d.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, color: 'var(--wt-danger)' }
  if (diff === 0) return { text: 'Today', color: 'var(--wt-accent)' }
  if (diff === 1) return { text: 'Tomorrow', color: 'var(--wt-accent)' }
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'var(--wt-text-muted)' }
}

const LIST_COLORS = [
  '#4285f4', '#ea4335', '#34a853', '#fbbc04', '#ff6d01',
  '#46bdc6', '#7baaf7', '#e6c9a8', '#e67c73', '#8e24aa',
]

function listColor(index: number): string {
  return LIST_COLORS[index % LIST_COLORS.length]
}

// ── Connect prompt ───────────────────────────────────────────────────────────

function ConnectPrompt() {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)

  function connect() {
    setLoading(true)
    startGCalAuth()
      .then(url => {
        const popup = window.open(url, 'gcal-auth', 'width=500,height=620,left=200,top=100')
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type === 'gcal-connected') {
            qc.invalidateQueries({ queryKey: ['gtasks-status'] })
            qc.invalidateQueries({ queryKey: ['gtasks-lists'] })
            window.removeEventListener('message', onMessage)
            popup?.close()
            setLoading(false)
          }
        }
        window.addEventListener('message', onMessage)
      })
      .catch(() => setLoading(false))
  }

  return (
    <Center className="absolute inset-0">
      <FlexCol align="center" gap="md" style={{ maxWidth: 320, textAlign: 'center', padding: '0 24px' }}>
        <Box style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'color-mix(in srgb, var(--wt-accent) 12%, var(--wt-surface))',
          border: '1px solid color-mix(in srgb, var(--wt-accent) 25%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon icon="CheckSquare" size={28} style={{ color: 'var(--wt-accent)' }} />
        </Box>
        <FlexCol align="center" gap="xs">
          <Text variant="heading" size="small" align="center">Connect Google Tasks</Text>
          <Text variant="body" size="medium" color="muted" align="center">
            Sign in with Google to see your tasks on this board.
          </Text>
        </FlexCol>
        <Button variant="accent" size="md" onClick={connect} disabled={loading}>
          {loading ? 'Opening...' : 'Connect Google Tasks'}
        </Button>
      </FlexCol>
    </Center>
  )
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  listColor: lc,
  onToggle,
  onDelete,
}: {
  task: GTask
  listColor: string
  onToggle: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const isCompleted = task.status === 'completed'
  const due = dueDateLabel(task.due)

  return (
    <div
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        padding:      '10px 16px',
        borderRadius: 10,
        background:   hovering ? 'var(--wt-surface-hover)' : 'transparent',
        transition:   'background 0.15s',
      }}
    >
      {/* Completion circle */}
      <button
        onClick={onToggle}
        style={{
          width:        20,
          height:       20,
          borderRadius: '50%',
          border:       isCompleted ? 'none' : `2px solid ${lc}`,
          background:   isCompleted ? lc : 'transparent',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          flexShrink:   0,
          marginTop:    2,
          transition:   'all 0.15s',
        }}
      >
        {isCompleted && <Icon icon="Check" size={12} style={{ color: '#fff' }} />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant="body"
          size="medium"
          style={{
            textDecoration: isCompleted ? 'line-through' : 'none',
            opacity:        isCompleted ? 0.5 : 1,
            lineHeight:     1.4,
          }}
        >
          {task.title || '(No title)'}
        </Text>
        {(task.notes || due) && (
          <FlexRow align="center" gap="sm" style={{ marginTop: 2 }}>
            {due && (
              <Text variant="caption" size="medium" style={{ color: due.color, fontWeight: 500 }}>
                {due.text}
              </Text>
            )}
            {task.notes && (
              <Text variant="caption" size="medium" color="muted" numberOfLines={1} style={{ opacity: 0.6 }}>
                {task.notes}
              </Text>
            )}
          </FlexRow>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          opacity:    hovering ? 0.6 : 0,
          cursor:     'pointer',
          background: 'none',
          border:     'none',
          padding:    4,
          flexShrink: 0,
          marginTop:  1,
          transition: 'opacity 0.15s',
          color:      'var(--wt-text-muted)',
        }}
      >
        <Icon icon="Trash" size={14} />
      </button>
    </div>
  )
}

// ── Add task input ───────────────────────────────────────────────────────────

function AddTaskInput({
  taskListId,
  onCreated,
}: {
  taskListId: string
  onCreated: () => void
}) {
  const [value, setValue] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      await createTask(taskListId, {
        title: value.trim(),
        due: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : undefined,
      })
      setValue('')
      setDueDate('')
      onCreated()
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        padding:      '8px 16px',
      }}
    >
      <Icon icon="Plus" size={16} style={{ color: 'var(--wt-accent)', flexShrink: 0, opacity: 0.7 }} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Add a task..."
        style={{
          flex:        1,
          background:  'transparent',
          border:      'none',
          outline:     'none',
          color:       'var(--wt-text)',
          fontSize:    14,
          padding:     '4px 0',
        }}
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{
          background:  'transparent',
          border:      '1px solid var(--wt-border)',
          borderRadius: 6,
          color:       'var(--wt-text)',
          fontSize:    12,
          padding:     '3px 6px',
          opacity:     dueDate ? 1 : 0.5,
        }}
      />
      {value.trim() && (
        <IconButton icon="ArrowRight" size="sm" onClick={submit} disabled={busy} />
      )}
    </div>
  )
}

// ── List section ─────────────────────────────────────────────────────────────

function ListSection({
  list,
  tasks,
  color,
  showCompleted,
  onRefresh,
}: {
  list: TaskList
  tasks: GTask[]
  color: string
  showCompleted: boolean
  onRefresh: () => void
}) {
  const pending   = tasks.filter(t => t.status === 'needsAction')
  const completed = tasks.filter(t => t.status === 'completed')
  const qc = useQueryClient()

  async function handleToggle(task: GTask) {
    await toggleTask(list.id, task.id, task.status)
    qc.invalidateQueries({ queryKey: ['gtasks-tasks-all'] })
  }

  async function handleDelete(task: GTask) {
    await deleteTask(list.id, task.id)
    qc.invalidateQueries({ queryKey: ['gtasks-tasks-all'] })
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {/* List header */}
      <FlexRow
        align="center"
        gap="sm"
        style={{ padding: '8px 16px', marginBottom: 2 }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
        <Text variant="label" size="medium" style={{ fontWeight: 600 }}>
          {list.title}
        </Text>
        <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.5 }}>
          {pending.length}
        </Text>
      </FlexRow>

      {/* Pending tasks */}
      {pending.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          listColor={color}
          onToggle={() => handleToggle(task)}
          onDelete={() => handleDelete(task)}
        />
      ))}

      {/* Add task */}
      <AddTaskInput
        taskListId={list.id}
        onCreated={() => qc.invalidateQueries({ queryKey: ['gtasks-tasks-all'] })}
      />

      {/* Completed tasks */}
      {showCompleted && completed.length > 0 && (
        <div style={{ opacity: 0.6, marginTop: 4 }}>
          {completed.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              listColor={color}
              onToggle={() => handleToggle(task)}
              onDelete={() => handleDelete(task)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function TodoBoardView() {
  const qc = useQueryClient()
  const { data: status, isLoading: statusLoading } = useTasksStatus()
  const { data: listsData } = useTaskLists()
  const connected = !!status?.connected

  const lists = listsData?.items ?? []

  // Track which lists are visible (default: all)
  const [visibleListIds, setVisibleListIds] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [spinning, setSpinning] = useState(false)

  // Initialize visible lists when data loads
  useEffect(() => {
    if (lists.length > 0 && visibleListIds.size === 0) {
      setVisibleListIds(new Set(lists.map(l => l.id)))
    }
  }, [lists])

  const activeListIds = lists
    .filter(l => visibleListIds.has(l.id))
    .map(l => l.id)

  const { data: allTasks } = useAllTasks(activeListIds, showCompleted)
  const tasks = allTasks ?? []

  function toggleListVisibility(id: string) {
    setVisibleListIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function refresh() {
    setSpinning(true)
    qc.invalidateQueries({ queryKey: ['gtasks-tasks-all'] })
    qc.invalidateQueries({ queryKey: ['gtasks-lists'] })
    setTimeout(() => setSpinning(false), 600)
  }

  if (statusLoading) return (
    <Center style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid var(--wt-border)', borderTopColor: 'var(--wt-accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Center>
  )
  if (!connected) return <ConnectPrompt />

  return (
    <FlexCol className="absolute inset-0" overflow="hidden" style={{ background: 'var(--wt-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <FlexRow
        align="center"
        gap="sm"
        style={{
          height:       56,
          padding:      '0 20px',
          flexShrink:   0,
          borderBottom: '1px solid var(--wt-border)',
        }}
      >
        <Icon icon="CheckSquare" size={20} style={{ color: 'var(--wt-accent)', flexShrink: 0 }} />
        <Text variant="heading" size="small" style={{ fontWeight: 700, flex: 1 }}>
          Todo
        </Text>

        {/* Show completed toggle */}
        <button
          onClick={() => setShowCompleted(s => !s)}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '4px 10px',
            borderRadius: 8,
            border:       '1px solid var(--wt-border)',
            background:   showCompleted ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'transparent',
            color:        showCompleted ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
            cursor:       'pointer',
            fontSize:     12,
            fontWeight:   500,
          }}
        >
          <Icon icon="CheckCircle" size={14} />
          Completed
        </button>

        {/* Refresh */}
        <IconButton
          icon="ArrowClockwise"
          size="sm"
          onClick={refresh}
          style={{
            transition: 'transform 0.4s',
            transform:  spinning ? 'rotate(360deg)' : 'none',
          }}
        />
      </FlexRow>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — list picker */}
        <div
          style={{
            width:         220,
            flexShrink:    0,
            borderRight:   '1px solid var(--wt-border)',
            display:       'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '14px 16px 8px' }}>
            <Text
              variant="label"
              size="small"
              color="muted"
              style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, opacity: 0.5 }}
            >
              Task Lists
            </Text>
          </div>
          <ScrollArea style={{ flex: 1 }}>
            {lists.map((list, i) => {
              const active = visibleListIds.has(list.id)
              const color = listColor(i)
              const count = tasks.filter(t => t._taskListId === list.id && t.status === 'needsAction').length
              return (
                <button
                  key={list.id}
                  onClick={() => toggleListVisibility(list.id)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10,
                    width:        '100%',
                    padding:      '8px 16px',
                    background:   'none',
                    border:       'none',
                    cursor:       'pointer',
                    opacity:      active ? 1 : 0.4,
                    transition:   'opacity 0.15s',
                    textAlign:    'left',
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color, flexShrink: 0,
                  }} />
                  <Text variant="body" size="small" style={{ flex: 1, fontWeight: 500 }} numberOfLines={1}>
                    {list.title}
                  </Text>
                  {active && count > 0 && (
                    <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.5 }}>
                      {count}
                    </Text>
                  )}
                </button>
              )
            })}
          </ScrollArea>
        </div>

        {/* Main task content */}
        <ScrollArea style={{ flex: 1 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px 48px' }}>
            {lists.filter(l => visibleListIds.has(l.id)).map((list, i) => {
              const listTasks = tasks.filter(t => t._taskListId === list.id)
              return (
                <ListSection
                  key={list.id}
                  list={list}
                  tasks={listTasks}
                  color={listColor(lists.indexOf(list))}
                  showCompleted={showCompleted}
                  onRefresh={refresh}
                />
              )
            })}

            {activeListIds.length === 0 && (
              <Center style={{ padding: 48 }}>
                <Text variant="body" size="medium" color="muted">
                  Select a task list from the sidebar to view tasks.
                </Text>
              </Center>
            )}
          </div>
        </ScrollArea>
      </div>
    </FlexCol>
  )
}
