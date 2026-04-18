import { useState } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import {
  useGoals, useGoalMilestones,
  useCreateGoal, useUpdateGoal, useDeleteGoal,
  useLogProgress,
  useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  type Goal, type GoalStatus, type GoalType, type GoalMilestone, type CreateGoalInput,
} from '../hooks/useGoals'

// ── Constants ──────────────────────────────────────────────────────────────────

const GOAL_COLORS = [
  '#3b82f6', '#8b5cf6', '#f97316', '#10b981',
  '#ec4899', '#f59e0b', '#06b6d4', '#ef4444',
]

const EMOJI_OPTIONS = ['🎯', '🏆', '💪', '📚', '🧘', '🏃', '💰', '🌱', '✈️', '🎓', '🎨', '🏋️', '🤝', '🚀', '❤️']

const TYPE_LABELS: Record<GoalType, string> = {
  numeric: 'Numeric',
  boolean: 'Yes / No',
  habit:   'Habit',
}

const STATUS_TABS: { key: GoalStatus; label: string }[] = [
  { key: 'active',    label: 'Active'    },
  { key: 'completed', label: 'Completed' },
  { key: 'archived',  label: 'Archived'  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function progressPct(goal: Goal): number {
  if (goal.type !== 'numeric' || !goal.target_value) return 0
  return Math.min((goal.current_value / goal.target_value) * 100, 100)
}

// ── Icon button (reuse pattern from RoutinesBoardView) ─────────────────────────

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26, borderRadius: 6, border: 'none',
  background: 'var(--wt-surface)', cursor: 'pointer',
  color: 'var(--wt-text-muted)',
}

// ── Goal card ──────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onLogProgress,
  onComplete,
  onArchive,
}: {
  goal:          Goal
  onEdit:        (g: Goal) => void
  onDelete:      (id: string) => void
  onLogProgress: (g: Goal) => void
  onComplete:    (id: string) => void
  onArchive:     (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const { data: milestones = [] } = useGoalMilestones(goal.id)
  const color = goal.color || '#3b82f6'
  const pct   = progressPct(goal)
  const isNumeric = goal.type === 'numeric'

  const completedMilestones = milestones.filter(m => m.completed).length

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${hovered ? color + '40' : 'var(--wt-border)'}`,
        background: 'var(--wt-surface)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered
          ? `0 0 0 1px ${color}18, 0 4px 20px ${color}10`
          : 'none',
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 3, background: color }} />

      <div style={{ padding: '14px 16px 12px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          {/* Emoji */}
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
            {goal.emoji}
          </span>

          {/* Title + type badge */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--wt-text)', lineHeight: 1.3 }}>
              {goal.title}
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                background: color + '20', color: color,
                letterSpacing: '0.03em',
              }}>
                {TYPE_LABELS[goal.type]}
              </span>

              {goal.target_date && (
                <span style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>
                  by {formatDate(goal.target_date)}
                </span>
              )}

              {milestones.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--wt-text-muted)' }}>
                  {completedMilestones}/{milestones.length} milestones
                </span>
              )}
            </div>
          </div>

          {/* Action icons (on hover) */}
          {hovered && (
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {goal.status === 'active' && isNumeric && (
                <button
                  onClick={() => onLogProgress(goal)}
                  title="Log progress"
                  style={{ ...iconBtnStyle, color }}
                >
                  <Icon icon="ChartLineUp" size={13} />
                </button>
              )}
              {goal.status === 'active' && (
                <button
                  onClick={() => onComplete(goal.id)}
                  title="Mark complete"
                  style={{ ...iconBtnStyle, color: 'var(--wt-success)' }}
                >
                  <Icon icon="CheckCircle" size={13} />
                </button>
              )}
              <button
                onClick={() => onEdit(goal)}
                title="Edit"
                style={iconBtnStyle}
              >
                <Icon icon="PencilSimple" size={13} />
              </button>
              {goal.status === 'active' && (
                <button
                  onClick={() => onArchive(goal.id)}
                  title="Archive"
                  style={iconBtnStyle}
                >
                  <Icon icon="Archive" size={13} />
                </button>
              )}
              <button
                onClick={() => onDelete(goal.id)}
                title="Delete"
                style={{ ...iconBtnStyle, color: 'var(--wt-danger)' }}
              >
                <Icon icon="Trash" size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {goal.description && (
          <div style={{
            fontSize: 12, color: 'var(--wt-text-muted)', lineHeight: 1.5,
            marginBottom: 10,
          }}>
            {goal.description}
          </div>
        )}

        {/* Progress bar (numeric goals only) */}
        {isNumeric && goal.target_value != null && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 5,
            }}>
              <span style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 100 ? 'var(--wt-success)' : 'var(--wt-text)' }}>
                {goal.current_value} / {goal.target_value}
                <span style={{ fontWeight: 400, color: 'var(--wt-text-muted)', marginLeft: 4 }}>
                  ({Math.round(pct)}%)
                </span>
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: 'var(--wt-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: pct >= 100 ? 'var(--wt-success)' : color,
                width: `${pct}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Boolean complete indicator */}
        {goal.type === 'boolean' && goal.status === 'completed' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--wt-success)', fontWeight: 550,
          }}>
            <Icon icon="CheckCircle" size={13} />
            Completed
          </div>
        )}
      </div>
    </div>
  )
}

// ── Goal form modal (create + edit) ───────────────────────────────────────────

function GoalModal({
  initial,
  onSave,
  onCancel,
}: {
  initial?:  Goal | null
  onSave:    (data: CreateGoalInput) => void
  onCancel:  () => void
}) {
  const [title,        setTitle]        = useState(initial?.title        ?? '')
  const [description,  setDescription]  = useState(initial?.description  ?? '')
  const [type,         setType]         = useState<GoalType>(initial?.type ?? 'boolean')
  const [emoji,        setEmoji]        = useState(initial?.emoji        ?? '🎯')
  const [color,        setColor]        = useState(initial?.color        ?? '#3b82f6')
  const [targetValue,  setTargetValue]  = useState(String(initial?.target_value  ?? ''))
  const [targetDate,   setTargetDate]   = useState(initial?.target_date  ?? '')
  const [showEmojiPick, setShowEmojiPick] = useState(false)

  // Milestones (managed separately in edit mode)
  const { data: milestones = [] }    = useGoalMilestones(initial?.id ?? null)
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()
  const [newMilestone, setNewMilestone] = useState('')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title:        title.trim(),
      description:  description.trim() || null,
      type,
      emoji,
      color,
      target_value: type === 'numeric' && targetValue ? Number(targetValue) : null,
      target_date:  targetDate || null,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
    border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
    color: 'var(--wt-text)', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)',
    marginBottom: 4, display: 'block', textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        borderRadius: 16, background: 'var(--wt-surface)',
        border: '1px solid var(--wt-border)',
        padding: '24px 24px 20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        width: 480, maxWidth: '90vw',
        maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--wt-text)' }}>
            {initial ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onCancel} style={{ ...iconBtnStyle, background: 'transparent' }}>
            <Icon icon="X" size={15} />
          </button>
        </div>

        {/* Emoji + Title row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Title</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowEmojiPick(p => !p)}
              style={{
                width: 38, height: 36, borderRadius: 7,
                border: '1px solid var(--wt-border)',
                background: 'var(--wt-bg)', fontSize: 18, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {emoji}
            </button>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Goal title…"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          {showEmojiPick && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setShowEmojiPick(false) }}
                  style={{
                    width: 32, height: 32, fontSize: 17, borderRadius: 6, border: 'none',
                    background: e === emoji ? 'var(--wt-accent)' : 'var(--wt-border)',
                    cursor: 'pointer',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does achieving this goal look like?"
            rows={2}
            style={{
              ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['boolean', 'numeric', 'habit'] as GoalType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 7, fontSize: 12, fontWeight: 550,
                  border: `1.5px solid ${type === t ? color : 'var(--wt-border)'}`,
                  background: type === t ? color + '18' : 'transparent',
                  color: type === t ? color : 'var(--wt-text-muted)',
                  cursor: 'pointer',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Numeric fields */}
        {type === 'numeric' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Target value</label>
              <input
                type="number"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="e.g. 100"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Target date (optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Non-numeric: just target date */}
        {type !== 'numeric' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {/* Color swatches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {GOAL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: 'none',
                  background: c, cursor: 'pointer', flexShrink: 0,
                  boxShadow: color === c ? `0 0 0 2px var(--wt-surface), 0 0 0 4px ${c}` : 'none',
                  transition: 'box-shadow 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Milestones (edit mode only) */}
        {initial && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Milestones</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {milestones.map(m => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  goalId={initial.id}
                  onToggle={() => updateMilestone.mutate({ goalId: initial.id, milestoneId: m.id, completed: !m.completed })}
                  onDelete={() => deleteMilestone.mutate({ goalId: initial.id, milestoneId: m.id })}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={newMilestone}
                onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newMilestone.trim()) {
                    createMilestone.mutate({ goalId: initial.id, title: newMilestone.trim() })
                    setNewMilestone('')
                  }
                }}
                placeholder="Add milestone…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  if (newMilestone.trim()) {
                    createMilestone.mutate({ goalId: initial.id, title: newMilestone.trim() })
                    setNewMilestone('')
                  }
                }}
                style={{
                  padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 550,
                  background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
              border: '1.5px solid var(--wt-border)', background: 'transparent',
              color: 'var(--wt-text)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
              background: title.trim() ? 'var(--wt-accent)' : 'var(--wt-border)',
              color: title.trim() ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
              border: 'none', cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {initial ? 'Save changes' : 'Create goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Milestone row ──────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone, goalId, onToggle, onDelete,
}: {
  milestone: GoalMilestone
  goalId:    string
  onToggle:  () => void
  onDelete:  () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px', borderRadius: 7,
        background: hovered ? 'var(--wt-surface-hover)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: milestone.completed ? 'none' : '2px solid var(--wt-border)',
          background: milestone.completed ? 'var(--wt-success)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {milestone.completed && (
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span style={{
        flex: 1, fontSize: 13,
        color: milestone.completed ? 'var(--wt-text-muted)' : 'var(--wt-text)',
        textDecoration: milestone.completed ? 'line-through' : 'none',
      }}>
        {milestone.title}
      </span>
      {hovered && (
        <button
          onClick={onDelete}
          style={{ ...iconBtnStyle, width: 22, height: 22, background: 'transparent', color: 'var(--wt-danger)' }}
        >
          <Icon icon="Trash" size={11} />
        </button>
      )}
    </div>
  )
}

// ── Log progress modal ─────────────────────────────────────────────────────────

function LogProgressModal({
  goal,
  onSave,
  onCancel,
}: {
  goal:     Goal
  onSave:   (value: number, note: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(String(goal.current_value))
  const [note,  setNote]  = useState('')
  const color = goal.color || '#3b82f6'
  const newPct = goal.target_value ? Math.min((Number(value) / goal.target_value) * 100, 100) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        borderRadius: 16, background: 'var(--wt-surface)',
        border: '1px solid var(--wt-border)',
        padding: '24px 24px 20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        width: 380, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--wt-text)' }}>
            Log Progress
          </h2>
          <button onClick={onCancel} style={{ ...iconBtnStyle, background: 'transparent' }}>
            <Icon icon="X" size={15} />
          </button>
        </div>

        {/* Goal summary */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--wt-bg)', border: '1px solid var(--wt-border)',
        }}>
          <span style={{ fontSize: 20 }}>{goal.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-text)' }}>{goal.title}</div>
            <div style={{ fontSize: 11, color: 'var(--wt-text-muted)', marginTop: 2 }}>
              Currently: {goal.current_value} / {goal.target_value}
            </div>
          </div>
        </div>

        {/* Value input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            New value
          </label>
          <input
            autoFocus
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && value) onSave(Number(value), note) }}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 14,
              border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
              color: 'var(--wt-text)', outline: 'none', boxSizing: 'border-box',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Live preview progress bar */}
        {goal.target_value != null && (
          <div>
            <div style={{ height: 5, borderRadius: 4, background: 'var(--wt-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: newPct >= 100 ? 'var(--wt-success)' : color,
                width: `${Math.min(newPct, 100)}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--wt-text-muted)', textAlign: 'right' }}>
              {Math.round(newPct)}% of {goal.target_value}
            </div>
          </div>
        )}

        {/* Note input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Note (optional)
          </label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What did you accomplish?"
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--wt-border)', background: 'var(--wt-bg)',
              color: 'var(--wt-text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
              border: '1.5px solid var(--wt-border)', background: 'transparent',
              color: 'var(--wt-text)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (value) onSave(Number(value), note) }}
            disabled={!value}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
              background: value ? 'var(--wt-accent)' : 'var(--wt-border)',
              color: value ? 'var(--wt-accent-text)' : 'var(--wt-text-muted)',
              border: 'none', cursor: value ? 'pointer' : 'not-allowed',
            }}
          >
            <Icon icon="ChartLineUp" size={13} />
            Log progress
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ status, onNew }: { status: GoalStatus; onNew: () => void }) {
  const messages: Record<GoalStatus, { emoji: string; title: string; body: string }> = {
    active:    { emoji: '🎯', title: 'No active goals',    body: 'Set a goal to track your progress toward something meaningful.' },
    completed: { emoji: '🏆', title: 'No completed goals', body: 'Goals you complete will appear here.' },
    archived:  { emoji: '📦', title: 'No archived goals',  body: 'Goals you archive will appear here.' },
  }
  const msg = messages[status]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flex: 1, gap: 10, padding: '40px 20px',
      color: 'var(--wt-text-muted)',
    }}>
      <span style={{ fontSize: 36 }}>{msg.emoji}</span>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--wt-text)' }}>{msg.title}</div>
      <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{msg.body}</div>
      {status === 'active' && (
        <button
          onClick={onNew}
          style={{
            marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 9, fontSize: 12, fontWeight: 550,
            background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Icon icon="Plus" size={13} />
          New goal
        </button>
      )}
    </div>
  )
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function GoalsBoardView() {
  const [activeStatus, setActiveStatus] = useState<GoalStatus>('active')
  const [creating,     setCreating]     = useState(false)
  const [editing,      setEditing]      = useState<Goal | null>(null)
  const [logging,      setLogging]      = useState<Goal | null>(null)

  const { data: goals = [], isLoading } = useGoals(activeStatus)
  const createGoal  = useCreateGoal()
  const updateGoal  = useUpdateGoal()
  const deleteGoal  = useDeleteGoal()
  const logProgress = useLogProgress()

  function handleCreate(data: CreateGoalInput) {
    createGoal.mutate(data, { onSuccess: () => setCreating(false) })
  }

  function handleUpdate(data: CreateGoalInput) {
    if (!editing) return
    updateGoal.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })
  }

  function handleComplete(id: string) {
    updateGoal.mutate({ id, status: 'completed' })
  }

  function handleArchive(id: string) {
    updateGoal.mutate({ id, status: 'archived' })
  }

  function handleLogProgress(value: number, note: string) {
    if (!logging) return
    logProgress.mutate({ id: logging.id, value, note: note || undefined }, {
      onSuccess: () => setLogging(null),
    })
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--wt-bg)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 14px',
        borderBottom: '1px solid var(--wt-border)',
        flexShrink: 0,
        gap: 12,
      }}>
        {/* Left: title + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', letterSpacing: '-0.02em', flexShrink: 0 }}>
            Goals
          </h1>

          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                style={{
                  padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 550,
                  border: `1.5px solid ${activeStatus === tab.key ? 'var(--wt-accent)' : 'transparent'}`,
                  background: activeStatus === tab.key
                    ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)'
                    : 'transparent',
                  color: activeStatus === tab.key ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: new goal button */}
        <button
          onClick={() => setCreating(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9, fontSize: 12, fontWeight: 550,
            background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Icon icon="Plus" size={13} />
          New goal
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--wt-text-muted)', fontSize: 13,
          }}>
            Loading goals…
          </div>
        ) : goals.length === 0 ? (
          <EmptyState status={activeStatus} onNew={() => setCreating(true)} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}>
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={g => setEditing(g)}
                onDelete={id => deleteGoal.mutate(id)}
                onLogProgress={g => setLogging(g)}
                onComplete={handleComplete}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {creating && (
        <GoalModal
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <GoalModal
          initial={editing}
          onSave={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {logging && (
        <LogProgressModal
          goal={logging}
          onSave={handleLogProgress}
          onCancel={() => setLogging(null)}
        />
      )}
    </div>
  )
}
