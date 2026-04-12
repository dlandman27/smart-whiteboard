import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, ScrollArea,
} from '@whiteboard/ui-kit'
import { useTaskGroups, useUnifiedTasks } from '../hooks/useUnifiedTasks'
import { toggleUnifiedTask, deleteUnifiedTask, createUnifiedTask } from '../hooks/useTaskMutations'
import type { UnifiedTask, SourceGroup } from '../types/unified'
import { navigateHash } from '../hooks/useHashRouter'
import { Logo } from './Logo'

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

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444', // red — urgent
  2: '#f97316', // orange — high
  3: '#3b82f6', // blue — normal
  4: '#9ca3af', // gray — low
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: UnifiedTask
  onToggle: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const circleColor = task.groupColor ?? '#9ca3af'
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
          width:          20,
          height:         20,
          borderRadius:   '50%',
          border:         task.completed ? 'none' : `2px solid ${circleColor}`,
          background:     task.completed ? circleColor : 'transparent',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         'pointer',
          flexShrink:     0,
          marginTop:      2,
          transition:     'all 0.15s',
        }}
      >
        {task.completed && <Icon icon="Check" size={12} style={{ color: '#fff' }} />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <FlexRow align="center" gap="xs">
          {task.priority < 4 && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: PRIORITY_COLORS[task.priority],
              flexShrink: 0,
            }} />
          )}
          <Text
            variant="body"
            size="medium"
            style={{
              textDecoration: task.completed ? 'line-through' : 'none',
              opacity:        task.completed ? 0.5 : 1,
              lineHeight:     1.4,
            }}
          >
            {task.title || '(No title)'}
          </Text>
        </FlexRow>
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

      {/* Delete — hidden for read-only sources */}
      {!task.readOnly && (
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
      )}
    </div>
  )
}

// ── Add task input ───────────────────────────────────────────────────────────

function AddTaskInput({
  providerId,
  groupId,
  onCreated,
}: {
  providerId: string
  groupId: string
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
      await createUnifiedTask(providerId, groupId, {
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
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        padding:    '8px 16px',
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
          flex:       1,
          background: 'transparent',
          border:     'none',
          outline:    'none',
          color:      'var(--wt-text)',
          fontSize:   14,
          padding:    '4px 0',
        }}
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{
          background:   'transparent',
          border:       '1px solid var(--wt-border)',
          borderRadius: 6,
          color:        'var(--wt-text)',
          fontSize:     12,
          padding:      '3px 6px',
          opacity:      dueDate ? 1 : 0.5,
        }}
      />
      {value.trim() && (
        <IconButton icon="ArrowRight" size="sm" onClick={submit} disabled={busy} />
      )}
    </div>
  )
}

// ── Task group section ───────────────────────────────────────────────────────

function TaskGroupSection({
  group,
  tasks,
  showCompleted,
}: {
  group: SourceGroup
  tasks: UnifiedTask[]
  showCompleted: boolean
}) {
  const qc = useQueryClient()
  const pending   = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  // Providers that have createTask support creation
  const canCreate = group.provider === 'builtin' || group.provider === 'gtasks' || group.provider === 'todoist'

  async function handleToggle(task: UnifiedTask) {
    await toggleUnifiedTask(task)
    qc.invalidateQueries({ queryKey: ['unified-tasks'] })
  }

  async function handleDelete(task: UnifiedTask) {
    await deleteUnifiedTask(task)
    qc.invalidateQueries({ queryKey: ['unified-tasks'] })
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Group header */}
      <FlexRow
        align="center"
        gap="sm"
        style={{ padding: '8px 16px', marginBottom: 2 }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: group.color, flexShrink: 0,
        }} />
        <Text variant="label" size="medium" style={{ fontWeight: 600 }}>
          {group.groupName}
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
          onToggle={() => handleToggle(task)}
          onDelete={() => handleDelete(task)}
        />
      ))}

      {/* Add task — only if provider supports creation */}
      {canCreate && (
        <AddTaskInput
          providerId={group.provider}
          groupId={group.groupName}
          onCreated={() => qc.invalidateQueries({ queryKey: ['unified-tasks'] })}
        />
      )}

      {/* Completed tasks */}
      {showCompleted && completed.length > 0 && (
        <div style={{ opacity: 0.6, marginTop: 4 }}>
          {completed.map(task => (
            <TaskRow
              key={task.id}
              task={task}
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

  const { data: groups = [] } = useTaskGroups()

  // Track which groups are visible (default: all)
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [spinning, setSpinning] = useState(false)

  // Initialize visible groups when data loads
  useEffect(() => {
    if (groups.length > 0 && visibleGroups.size === 0) {
      setVisibleGroups(new Set(groups.map(g => g.key)))
    }
  }, [groups])

  const { data: tasks = [] } = useUnifiedTasks(visibleGroups, showCompleted)

  // Group the sidebar items by provider
  const providerSections = groups.reduce<
    { provider: string; label: string; icon: string; groups: SourceGroup[] }[]
  >((acc, g) => {
    let section = acc.find(s => s.provider === g.provider)
    if (!section) {
      section = { provider: g.provider, label: g.providerLabel, icon: g.providerIcon, groups: [] }
      acc.push(section)
    }
    section.groups.push(g)
    return acc
  }, [])

  // Compute task counts per group
  const countByGroup = new Map<string, number>()
  for (const t of tasks) {
    if (t.completed) continue
    const key = `${t.source.provider}:${t.groupName}`
    countByGroup.set(key, (countByGroup.get(key) ?? 0) + 1)
  }

  function toggleGroupVisibility(key: string) {
    setVisibleGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function refresh() {
    setSpinning(true)
    qc.invalidateQueries({ queryKey: ['unified-tasks'] })
    qc.invalidateQueries({ queryKey: ['unified-task-groups'] })
    setTimeout(() => setSpinning(false), 600)
  }

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

        {/* Sidebar — multi-provider source picker */}
        <div
          style={{
            width:         220,
            flexShrink:    0,
            borderRight:   '1px solid var(--wt-border)',
            display:       'flex',
            flexDirection: 'column',
          }}
        >
          <ScrollArea style={{ flex: 1 }}>
            {providerSections.map(section => (
              <div key={section.provider}>
                {/* Provider header */}
                <FlexRow
                  align="center"
                  gap="xs"
                  style={{ padding: '14px 16px 6px' }}
                >
                  {section.provider === 'builtin' ? (
                    <Logo size={14} />
                  ) : (
                    <span style={{
                      width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                      background: section.provider === 'todoist' ? '#e44332' : section.provider === 'gtasks' ? '#4285f4' : 'var(--wt-text-muted)',
                    }}>
                      {section.provider === 'todoist' ? 'T' : section.provider === 'gtasks' ? 'G' : '?'}
                    </span>
                  )}
                  <Text
                    variant="label"
                    size="small"
                    color="muted"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, opacity: 0.5 }}
                  >
                    {section.label}
                  </Text>
                </FlexRow>

                {/* Groups under this provider */}
                {section.groups.map(group => {
                  const active = visibleGroups.has(group.key)
                  const count = countByGroup.get(group.key) ?? 0
                  return (
                    <button
                      key={group.key}
                      onClick={() => toggleGroupVisibility(group.key)}
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        width:      '100%',
                        padding:    '8px 16px',
                        background: 'none',
                        border:     'none',
                        cursor:     'pointer',
                        opacity:    active ? 1 : 0.4,
                        transition: 'opacity 0.15s',
                        textAlign:  'left',
                      }}
                    >
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: group.color, flexShrink: 0,
                      }} />
                      <Text variant="body" size="small" style={{ flex: 1, fontWeight: 500 }} numberOfLines={1}>
                        {group.groupName}
                      </Text>
                      {active && count > 0 && (
                        <Text variant="caption" size="medium" color="muted" style={{ opacity: 0.5 }}>
                          {count}
                        </Text>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </ScrollArea>

          {/* Connect more link */}
          <button
            onClick={() => navigateHash('connectors', 'tasks')}
            style={{
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              gap:          6,
              padding:      '12px 16px',
              borderTop:    '1px solid var(--wt-border)',
              background:   'none',
              border:       'none',
              borderTopStyle: 'solid',
              borderTopWidth: 1,
              borderTopColor: 'var(--wt-border)',
              cursor:       'pointer',
              color:        'var(--wt-text-muted)',
              fontSize:     12,
              fontWeight:   500,
              opacity:      0.6,
              transition:   'opacity 0.15s',
            }}
            onPointerEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6' }}
          >
            <Icon icon="Plus" size={12} />
            Connect more sources
          </button>
        </div>

        {/* Main task content */}
        <ScrollArea style={{ flex: 1 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px 48px' }}>
            {groups.filter(g => visibleGroups.has(g.key)).map(group => {
              const groupTasks = tasks.filter(
                t => t.source.provider === group.provider && t.groupName === group.groupName
              )
              return (
                <TaskGroupSection
                  key={group.key}
                  group={group}
                  tasks={groupTasks}
                  showCompleted={showCompleted}
                />
              )
            })}

            {visibleGroups.size === 0 && (
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
