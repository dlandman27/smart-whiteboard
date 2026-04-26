import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, FlexRow, Text, Box } from '@whiteboard/ui-kit'
import { useWiigitTasks, useToggleWiigitTask, useCreateWiigitTask, type WiigitTask } from '../../hooks/useWiigitTasks'

interface TaskListSettings {
  listName: string
  showCompleted: boolean
}

const DEFAULTS: TaskListSettings = { listName: 'My Tasks', showCompleted: false }

// Semantic priority colors — these are intentional named constants, not arbitrary hardcodes.
// Priority 1 = urgent/red, 2 = warning/amber, 3 = info/blue, 4 = muted.
const PRIORITY_COLORS: Record<number, string> = {
  1: 'var(--wt-danger)',
  2: '#f59e0b',
  3: '#3b82f6',
  4: 'var(--wt-border)',
}

// 20% opacity hex suffix per priority for unchecked circle fill tint
const PRIORITY_TINT: Record<number, string> = {
  1: 'rgba(239,68,68,0.12)',
  2: 'rgba(245,158,11,0.12)',
  3: 'rgba(59,130,246,0.12)',
  4: 'transparent',
}

export function TaskListWidget({ widgetId }: { widgetId: string }) {
  const [settings]   = useWidgetSettings<TaskListSettings>(widgetId, DEFAULTS)
  const listName     = settings.listName || 'My Tasks'
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const { data: tasks = [], isLoading } = useWiigitTasks(listName)
  const toggle = useToggleWiigitTask()
  const create = useCreateWiigitTask(listName)

  const today    = new Date().toISOString().slice(0, 10)
  const visible  = settings.showCompleted ? tasks : tasks.filter((t) => t.status !== 'completed')
  const active   = tasks.filter((t) => t.status !== 'completed').length

  function handleAdd() {
    const t = newTitle.trim()
    if (!t) return
    create.mutate(t)
    setNewTitle('')
    setAdding(false)
  }

  return (
    <FlexCol fullHeight fullWidth noSelect style={{ overflow: 'hidden' }}>
      {/* Header */}
      <FlexRow
        fullWidth align="center" justify="between"
        style={{ padding: '10px 14px 6px', flexShrink: 0 }}
      >
        <FlexRow align="center" style={{ gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: 700 }}>{listName}</Text>
          {active > 0 && (
            <span style={{
              fontSize: 13, fontWeight: 600, padding: '4px 10px',
              borderRadius: 10, background: 'var(--wt-accent)',
              color: 'var(--wt-accent-text)',
            }}>
              {active}
            </span>
          )}
        </FlexRow>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setAdding(true)}
          style={{
            fontSize: 20, lineHeight: 1, background: 'none', border: 'none',
            color: 'var(--wt-text-muted)', cursor: 'pointer', padding: '0 2px',
            opacity: 0.6,
          }}
          title="Add task"
        >
          +
        </button>
      </FlexRow>

      {/* Quick-add input */}
      {adding && (
        <Box style={{ padding: '0 10px 8px', flexShrink: 0 }}>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
            }}
            onBlur={() => { if (!newTitle.trim()) setAdding(false) }}
            placeholder="New task…"
            style={{
              width: '100%', fontSize: 15, padding: '10px',
              borderRadius: 12, border: '1px solid var(--wt-accent)',
              background: 'var(--wt-surface)', color: 'var(--wt-text)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </Box>
      )}

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {isLoading ? (
          // Skeleton loading — 3 rows with circle + bar
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 3,
                  borderRadius: 14, border: '1px solid var(--wt-border)',
                  background: 'var(--wt-surface)',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--wt-surface-hover)', flexShrink: 0,
                }} />
                <div style={{
                  height: 15, borderRadius: 6,
                  background: 'var(--wt-surface-hover)', flex: 1,
                }} />
              </div>
            ))}
          </>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: 'center', paddingTop: 32,
            fontSize: active === 0 ? 16 : 13,
            color: active === 0 ? 'var(--wt-success)' : 'var(--wt-text-muted)',
            opacity: active === 0 ? 0.6 : 0.5,
          }}>
            {active === 0 ? 'All done!' : 'Nothing here'}
          </div>
        ) : (
          visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              onToggle={() => toggle.mutate({ id: task.id, completed: task.status === 'completed' })}
            />
          ))
        )}
      </div>
    </FlexCol>
  )
}

function TaskRow({ task, today, onToggle }: { task: WiigitTask; today: string; onToggle: () => void }) {
  const done      = task.status === 'completed'
  const isOverdue = task.due && task.due.slice(0, 10) < today && !done
  const priority  = task.priority ?? 4

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', marginBottom: 3,
        borderRadius: 14, textAlign: 'left', cursor: 'pointer',
        // Use explicit border sides so borderLeft can be overridden for overdue
        borderTop:    '1px solid var(--wt-border)',
        borderRight:  '1px solid var(--wt-border)',
        borderBottom: '1px solid var(--wt-border)',
        borderLeft:   isOverdue ? '4px solid var(--wt-danger)' : '1px solid var(--wt-border)',
        background:   done ? 'transparent' : 'var(--wt-surface)',
        opacity:      done ? 0.35 : 1,
        transition:   'opacity 0.15s',
      }}
    >
      {/* Checkbox — 22px, priority color fill on unchecked */}
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        border: done ? 'none' : `1.5px solid ${PRIORITY_COLORS[priority] ?? 'var(--wt-border)'}`,
        background: done
          ? 'var(--wt-success)'
          : (PRIORITY_TINT[priority] ?? 'transparent'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done && (
          <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500, lineHeight: 1.3,
          color: 'var(--wt-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.title}
        </div>
        {task.due && (
          <div style={{
            fontSize: isOverdue ? 13 : 12, marginTop: 2,
            color: isOverdue ? 'var(--wt-danger)' : 'var(--wt-text-muted)',
            fontWeight: isOverdue ? 700 : 400,
          }}>
            {isOverdue ? '⚠ ' : ''}
            {new Date(task.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function TaskListSettings({ widgetId }: { widgetId: string }) {
  const [settings, update] = useWidgetSettings<TaskListSettings>(widgetId, DEFAULTS)

  return (
    <FlexCol style={{ padding: 16, gap: 14 }}>
      <FlexCol style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          List Name
        </Text>
        <input
          value={settings.listName || ''}
          onChange={(e) => update({ listName: e.target.value })}
          placeholder="My Tasks"
          style={{
            fontSize: 13, padding: '7px 10px', borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
          }}
        />
        <Text style={{ fontSize: 10, opacity: 0.45 }}>
          Must match the list name exactly (case-sensitive)
        </Text>
      </FlexCol>

      <FlexRow align="center" justify="between">
        <Text style={{ fontSize: 12 }}>Show completed tasks</Text>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => update({ showCompleted: !settings.showCompleted })}
          style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: settings.showCompleted ? 'var(--wt-accent)' : 'var(--wt-border)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: settings.showCompleted ? 18 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'white', transition: 'left 0.2s',
          }} />
        </button>
      </FlexRow>
    </FlexCol>
  )
}
