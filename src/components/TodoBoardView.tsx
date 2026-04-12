import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlexRow, FlexCol, Box, Text, Icon, Center,
  IconButton, ScrollArea,
} from '@whiteboard/ui-kit'
import { useTaskGroups, useUnifiedTasks } from '../hooks/useUnifiedTasks'
import { toggleUnifiedTask, deleteUnifiedTask, createUnifiedTask, createUnifiedGroup } from '../hooks/useTaskMutations'
import type { UnifiedTask, SourceGroup } from '../types/unified'
import { navigateHash } from '../hooks/useHashRouter'
import { getTaskProviders } from '../providers'
import { ProviderIcon } from './ProviderIcon'

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
          key={`${task.source.provider}:${task.source.id}`}
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
              key={`${task.source.provider}:${task.source.id}`}
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

  // Single active list
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListProvider, setNewListProvider] = useState('builtin')
  const [creatingList, setCreatingList] = useState(false)

  // Auto-select first list when data loads
  useEffect(() => {
    if (groups.length > 0 && !activeGroupKey) {
      setActiveGroupKey(groups[0].key)
    }
  }, [groups])

  // Pass only the active group to the query
  const visibleGroups = activeGroupKey ? new Set([activeGroupKey]) : new Set<string>()
  const { data: tasks = [] } = useUnifiedTasks(visibleGroups, showCompleted)
  const activeGroup = groups.find(g => g.key === activeGroupKey)

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

  async function handleCreateList() {
    if (!newListName.trim() || creatingList) return
    setCreatingList(true)
    try {
      const name = newListName.trim()
      await createUnifiedGroup(newListProvider, name)
      qc.invalidateQueries({ queryKey: ['unified-task-groups'] })
      qc.invalidateQueries({ queryKey: ['unified-tasks'] })
      setActiveGroupKey(`${newListProvider}:${name}`)
      setNewListName('')
      setShowNewList(false)
    } finally {
      setCreatingList(false)
    }
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

        {/* Sidebar */}
        <div
          style={{
            width:           240,
            flexShrink:      0,
            display:         'flex',
            flexDirection:   'column',
            backgroundColor: 'var(--wt-settings-bg)',
            borderRight:     '1px solid var(--wt-settings-border)',
            backdropFilter:  'var(--wt-backdrop)',
          }}
        >
          <ScrollArea style={{ flex: 1, padding: '8px' }}>
            {providerSections.map(section => (
              <div key={section.provider} style={{ marginBottom: 8 }}>
                {/* Provider header */}
                <FlexRow
                  align="center"
                  gap="xs"
                  style={{ padding: '10px 10px 6px' }}
                >
                  <ProviderIcon provider={section.provider} size={15} />
                  <Text
                    variant="label"
                    size="small"
                    color="muted"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: 10, opacity: 0.5 }}
                  >
                    {section.label}
                  </Text>
                </FlexRow>

                {/* Groups under this provider */}
                {section.groups.map(group => {
                  const active = group.key === activeGroupKey
                  return (
                    <button
                      key={group.key}
                      onClick={() => setActiveGroupKey(group.key)}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          10,
                        width:        '100%',
                        padding:      '8px 10px',
                        background:   active ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'transparent',
                        border:       active ? '1px solid color-mix(in srgb, var(--wt-accent) 25%, transparent)' : '1px solid transparent',
                        borderRadius: 10,
                        cursor:       'pointer',
                        transition:   'all 0.15s',
                        textAlign:    'left',
                      }}
                    >
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: group.color ?? 'var(--wt-text-muted)', flexShrink: 0,
                      }} />
                      <Text
                        variant="body" size="small" numberOfLines={1}
                        style={{
                          flex: 1, fontWeight: active ? 600 : 400,
                          color: active ? 'var(--wt-accent)' : 'var(--wt-text)',
                          fontSize: 13,
                        }}
                      >
                        {group.groupName}
                      </Text>
                    </button>
                  )
                })}
              </div>
            ))}
          </ScrollArea>

          {/* New list + Connect more */}
          <div style={{ padding: '6px 8px', borderTop: '1px solid var(--wt-settings-divider)' }}>
            {showNewList ? (
              <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateList()
                    if (e.key === 'Escape') { setShowNewList(false); setNewListName('') }
                  }}
                  placeholder="List name..."
                  style={{
                    background: 'var(--wt-surface)', border: '1px solid var(--wt-settings-border)',
                    borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--wt-text)',
                    outline: 'none', width: '100%',
                  }}
                />
                <select
                  value={newListProvider}
                  onChange={(e) => setNewListProvider(e.target.value)}
                  style={{
                    background: 'var(--wt-surface)', border: '1px solid var(--wt-settings-border)',
                    borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--wt-text)',
                    outline: 'none', width: '100%',
                  }}
                >
                  {getTaskProviders()
                    .filter(p => p.createGroup)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))
                  }
                </select>
                <FlexRow gap="xs">
                  <button
                    onClick={handleCreateList}
                    disabled={creatingList || !newListName.trim()}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                      background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: creatingList || !newListName.trim() ? 0.5 : 1,
                    }}
                  >
                    {creatingList ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowNewList(false); setNewListName('') }}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--wt-settings-border)',
                      background: 'none', color: 'var(--wt-text-muted)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </FlexRow>
              </div>
            ) : (
              <button
                onClick={() => setShowNewList(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 10px', width: '100%', borderRadius: 10,
                  background: 'none', border: '1px solid transparent', cursor: 'pointer',
                  color: 'var(--wt-accent)', fontSize: 12, fontWeight: 500,
                  opacity: 0.7, transition: 'all 0.15s',
                }}
                onPointerEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
              >
                <Icon icon="Plus" size={12} />
                New list
              </button>
            )}
            <button
              onClick={() => navigateHash('connectors', 'tasks')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 10px', width: '100%', borderRadius: 10,
                background: 'none', border: '1px solid transparent', cursor: 'pointer',
                color: 'var(--wt-text-muted)', fontSize: 12, fontWeight: 500,
                opacity: 0.5, transition: 'all 0.15s',
              }}
              onPointerEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8' }}
              onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5' }}
            >
              <Icon icon="Link" size={12} />
              Connect sources
            </button>
          </div>
        </div>

        {/* Main task content */}
        <ScrollArea style={{ flex: 1 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px 48px' }}>
            {activeGroup ? (
              <TaskGroupSection
                key={activeGroup.key}
                group={activeGroup}
                tasks={tasks}
                showCompleted={showCompleted}
              />
            ) : (
              <Center style={{ padding: 48 }}>
                <Text variant="body" size="medium" color="muted">
                  Select a task list from the sidebar.
                </Text>
              </Center>
            )}
          </div>
        </ScrollArea>
      </div>
    </FlexCol>
  )
}
